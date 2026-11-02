import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  copyDatastore,
  getReplicaStatus,
  resolveReplicaConflict,
  setPrimaryReplica,
} from "@/lib/db";
import { clearGitHubAuthToken, setGitHubAuthToken } from "@/lib/datastore/auth";
import { contentHash } from "@/lib/datastore/content-hash";
import { getRegistryEntry, upsertRegistryEntry } from "@/lib/datastore/registry";
import { createEmptyDocument } from "@/lib/datastore/schema";
import { withReplicaLink, withSyncBase } from "@/lib/datastore/sync";
import type { Location, MyRegularsDocument } from "@/lib/datastore/types";

const { fakeClient, vaultsGetOne, vaultsCreate, vaultsUpdate } = vi.hoisted(() => {
  const vaultsGetOne = vi.fn();
  const vaultsCreate = vi.fn();
  const vaultsUpdate = vi.fn();
  const fakeClient = {
    authStore: { token: "t", record: { id: "u" }, isValid: true },
    filter: (raw: string) => raw,
    collection: () => ({
      getOne: vaultsGetOne,
      create: vaultsCreate,
      update: vaultsUpdate,
      delete: vi.fn(),
      getFullList: vi.fn(),
    }),
  };
  return { fakeClient, vaultsGetOne, vaultsCreate, vaultsUpdate };
});

vi.mock("@/lib/datastore/pocketbase-config", () => ({
  isHostedConfigured: () => true,
  getPocketBaseClient: () => fakeClient,
}));

function gistResponse(document: unknown, version: string): Response {
  return new Response(
    JSON.stringify({
      id: "abc123",
      files: { "myregulars.json": { content: JSON.stringify(document) } },
      history: [{ version, committed_at: "2026-04-23T12:00:00.000Z" }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function gistBody(call: unknown[]): MyRegularsDocument {
  const init = call[1] as RequestInit;
  const body = JSON.parse(String(init.body)) as { files: Record<string, { content: string }> };
  return JSON.parse(Object.values(body.files)[0].content) as MyRegularsDocument;
}

function location(id: string, name: string): Location {
  return {
    id,
    name,
    groups: [],
    createdAt: "2026-04-23T12:00:00.000Z",
    updatedAt: "2026-04-23T12:00:00.000Z",
  };
}

function docWith(
  locations: Location[],
  extra: Partial<MyRegularsDocument> = {},
): MyRegularsDocument {
  return {
    ...createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"), { id: "v1", name: "Home" }),
    data: { locations },
    ...extra,
  };
}

const base = docWith([location("L1", "Cafe")]);
const baseHash = contentHash(base);
const gistLinked = withSyncBase(withReplicaLink(base, "hosted", "rec9"), baseHash);
const hostedLinked = withSyncBase(withReplicaLink(base, "gist", "abc123"), baseHash);

function hostedRecord(document: MyRegularsDocument, updated = "pb-1") {
  return { owner: "u", public: false, document, updated };
}

function linkRegistry(agreed?: string) {
  upsertRegistryEntry({
    id: "v1",
    name: "Home",
    replicas: { gist: { uri: "gist:abc123" }, hosted: { uri: "hosted:rec9" } },
    primary: "gist",
    lastOpened: "2026-04-23T12:00:00.000Z",
    peopleCount: 0,
    locationCount: 1,
    agreed,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vaultsGetOne.mockReset();
  vaultsCreate.mockReset();
  vaultsUpdate.mockReset();
  localStorage.clear();
  clearGitHubAuthToken();
  setGitHubAuthToken("token");
});

describe("getReplicaStatus", () => {
  it("reports a single copy with no sibling", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(gistResponse(base, "sha-1")));
    const result = await getReplicaStatus("gist:abc123");
    expect(result.siblingUri).toBeNull();
    expect(result.status).toBeNull();
    expect(result.copies.gist?.locationCount).toBe(1);
    expect(result.copies.hosted).toBeUndefined();
  });

  it("reads both copies without writing and reports in sync", async () => {
    linkRegistry(baseHash);
    const fetchMock = vi.fn().mockResolvedValueOnce(gistResponse(gistLinked, "sha-1"));
    vi.stubGlobal("fetch", fetchMock);
    vaultsGetOne.mockResolvedValueOnce(hostedRecord(hostedLinked));

    const result = await getReplicaStatus("gist:abc123");

    expect(result.siblingUri).toBe("hosted:rec9");
    expect(result.status).toEqual({ kind: "inSync", hash: baseHash });
    expect(result.copies.hosted?.uri).toBe("hosted:rec9");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vaultsUpdate).not.toHaveBeenCalled();
  });

  it("reports a fast-forward when one side moved", async () => {
    linkRegistry(baseHash);
    const ahead = {
      ...gistLinked,
      data: { locations: [location("L1", "Cafe"), location("L2", "Gym")] },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(gistResponse(ahead, "sha-2")));
    vaultsGetOne.mockResolvedValueOnce(hostedRecord(hostedLinked));

    const result = await getReplicaStatus("gist:abc123");
    expect(result.status).toMatchObject({ kind: "fastForward", from: "gist", to: "hosted" });
  });

  it("reports divergence when both sides moved", async () => {
    linkRegistry(baseHash);
    const gistMoved = { ...gistLinked, data: { locations: [location("L2", "Gym")] } };
    const hostedMoved = { ...hostedLinked, data: { locations: [location("L3", "Bar")] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(gistResponse(gistMoved, "sha-2")));
    vaultsGetOne.mockResolvedValueOnce(hostedRecord(hostedMoved));

    const result = await getReplicaStatus("gist:abc123");
    expect(result.status).toEqual({ kind: "diverged" });
  });
});

describe("resolveReplicaConflict", () => {
  it("overwrites the other copy with the kept side and records the agreed hash", async () => {
    linkRegistry(baseHash);
    const gistMoved = { ...gistLinked, data: { locations: [location("L2", "Gym")] } };
    const hostedMoved = { ...hostedLinked, data: { locations: [location("L3", "Bar")] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(gistResponse(gistMoved, "sha-2")));
    vaultsGetOne.mockResolvedValueOnce(hostedRecord(hostedMoved, "pb-2"));
    vaultsUpdate.mockImplementationOnce(
      async (_id: string, body: { document: MyRegularsDocument }) =>
        hostedRecord(body.document, "pb-3"),
    );

    const result = await resolveReplicaConflict("gist:abc123", "gist");

    const written = vaultsUpdate.mock.calls[0][1].document as MyRegularsDocument;
    expect(written.data.locations.map((l) => l.id)).toEqual(["L2"]);
    expect(written.sync?.base).toBe(contentHash(gistMoved));
    expect(written.replicas).toEqual({ gist: { id: "abc123" } });
    expect(result.status).toEqual({ kind: "inSync", hash: contentHash(gistMoved) });
    expect(result.sibling.version).toBe("pb-3");
    expect(getRegistryEntry("v1")?.agreed).toBe(contentHash(gistMoved));
  });

  it("can keep the hosted side, writing the gist", async () => {
    linkRegistry(baseHash);
    const gistMoved = { ...gistLinked, data: { locations: [location("L2", "Gym")] } };
    const hostedMoved = { ...hostedLinked, data: { locations: [location("L3", "Bar")] } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(gistResponse(gistMoved, "sha-2"))
      .mockImplementationOnce(async (url: string, init: RequestInit) =>
        gistResponse(gistBody([url, init]), "sha-3"),
      );
    vi.stubGlobal("fetch", fetchMock);
    vaultsGetOne.mockResolvedValueOnce(hostedRecord(hostedMoved, "pb-2"));

    const result = await resolveReplicaConflict("gist:abc123", "hosted");

    const written = gistBody(fetchMock.mock.calls[1]);
    expect(written.data.locations.map((l) => l.id)).toEqual(["L3"]);
    expect(result.primary.version).toBe("sha-3");
    expect(vaultsUpdate).not.toHaveBeenCalled();
  });
});

describe("copyDatastore without linking", () => {
  it("creates an independent copy with a new id and leaves the source untouched", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(gistResponse(base, "sha-1"));
    vi.stubGlobal("fetch", fetchMock);
    vaultsCreate.mockImplementationOnce(async (body: { document: MyRegularsDocument }) => ({
      id: "rec5",
      owner: "u",
      name: body.document.name,
      document: body.document,
      updated: "pb-1",
    }));

    const result = await copyDatastore("gist:abc123", "hosted", { link: false });

    const seed = vaultsCreate.mock.calls[0][0].document as MyRegularsDocument;
    expect(seed.id).not.toBe("v1");
    expect(seed.replicas).toBeUndefined();
    expect(seed.sync).toBeUndefined();
    expect(seed.data.locations).toEqual(base.data.locations);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.target.uri).toBe("hosted:rec5");
    expect(getRegistryEntry("v1")).toBeNull();
    expect(getRegistryEntry(seed.id)?.replicas).toEqual({ hosted: { uri: "hosted:rec5" } });
  });
});

describe("setPrimaryReplica", () => {
  it("switches the registry primary and the preferred uri", () => {
    linkRegistry(baseHash);
    setPrimaryReplica("hosted:rec9");
    expect(getRegistryEntry("v1")?.primary).toBe("hosted");
  });
});
