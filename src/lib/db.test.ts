import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectDatastore,
  copyDatastore,
  createDatastore,
  deleteDatastore,
  listDatastoreVersions,
  loadDatastore,
  loadDatastoreVersion,
  readCachedDatastore,
  saveDatastore,
  syncDatastoreReplicas,
} from "@/lib/db";
import { clearGitHubAuthToken, setGitHubAuthToken } from "@/lib/datastore/auth";
import { contentHash } from "@/lib/datastore/content-hash";
import { DatastoreConflictError, DatastoreNotInSyncError } from "@/lib/datastore/errors";
import { getRegistryEntry, upsertRegistryEntry } from "@/lib/datastore/registry";
import { createEmptyDocument } from "@/lib/datastore/schema";
import { withReplicaLink, withSyncBase } from "@/lib/datastore/sync";
import type { Location, MyRegularsDocument } from "@/lib/datastore/types";

const { fakeClient, vaultsGetOne, vaultsCreate, vaultsUpdate, vaultsDelete } = vi.hoisted(() => {
  const vaultsGetOne = vi.fn();
  const vaultsCreate = vi.fn();
  const vaultsUpdate = vi.fn();
  const vaultsDelete = vi.fn();
  const fakeClient = {
    authStore: { token: "t", record: { id: "u" }, isValid: true },
    filter: (raw: string) => raw,
    collection: () => ({
      getOne: vaultsGetOne,
      create: vaultsCreate,
      update: vaultsUpdate,
      delete: vaultsDelete,
      getFullList: vi.fn(),
    }),
  };
  return { fakeClient, vaultsGetOne, vaultsCreate, vaultsUpdate, vaultsDelete };
});

vi.mock("@/lib/datastore/pocketbase-config", () => ({
  isHostedConfigured: () => true,
  getPocketBaseClient: () => fakeClient,
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

function gistResponse(document: unknown, version: string, fileName = "myregulars.json") {
  return jsonResponse({
    id: "abc123",
    files: { [fileName]: { content: JSON.stringify(document) } },
    history: [{ version, committed_at: "2026-04-23T12:00:00.000Z" }],
  });
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

/** Parses the document a gist PATCH/POST carried. */
function gistBody(call: unknown[]): MyRegularsDocument {
  const init = call[1] as RequestInit;
  const body = JSON.parse(String(init.body)) as {
    files: Record<string, { content: string }>;
  };
  const [file] = Object.values(body.files);
  return JSON.parse(file.content) as MyRegularsDocument;
}

describe("db facade", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vaultsGetOne.mockReset();
    vaultsCreate.mockReset();
    vaultsUpdate.mockReset();
    vaultsDelete.mockReset();
    localStorage.clear();
    clearGitHubAuthToken();
  });

  it("connects a datastore reference", async () => {
    await expect(connectDatastore("https://myregulars.app/?gist=abc123")).resolves.toEqual({
      uri: "gist:abc123",
      provider: "gist",
      id: "abc123",
      gistId: "abc123",
      shareUrl: "http://localhost:3000/?gist=abc123",
    });
  });

  it("routes hosted uris to the PocketBase adapter and reports the owner", async () => {
    const document = createEmptyDocument();
    vaultsGetOne.mockResolvedValueOnce({ owner: "u", public: false, document, updated: "v1" });

    const snapshot = await loadDatastore("hosted:rec1");

    expect(vaultsGetOne).toHaveBeenCalledWith("rec1");
    expect(snapshot.uri).toBe("hosted:rec1");
    expect(snapshot.version).toBe("v1");
    expect(snapshot.source).toBe("remote");
    expect(snapshot.ownerId).toBe("u");
    expect(snapshot.isPublic).toBe(false);
  });

  it("creates a datastore with a single fetch call", async () => {
    setGitHubAuthToken("token");
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(gistResponse(document, "sha-create")));

    const snapshot = await createDatastore();

    expect(snapshot.uri).toBe("gist:abc123");
    expect(snapshot.version).toBe("sha-create");
    expect(snapshot.document).toEqual(document);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("puts the vault name inside a new gist document, not only in the file name", async () => {
    setGitHubAuthToken("token");
    const fetchMock = vi.fn().mockImplementationOnce(async (_url: string, init: RequestInit) => {
      const sent = gistBody([_url, init]);
      return gistResponse(sent, "sha-create", "myregulars.morning-cafe.json");
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await createDatastore("Morning Cafe");

    expect(gistBody(fetchMock.mock.calls[0]).name).toBe("Morning Cafe");
    expect(snapshot.document.name).toBe("Morning Cafe");
  });

  it("loads from remote and falls back to cache when remote read fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(gistResponse(createEmptyDocument(), "sha-latest"))
      .mockRejectedValueOnce(new Error("offline"));

    vi.stubGlobal("fetch", fetchMock);

    const remoteSnapshot = await loadDatastore("gist:abc123");
    const cachedSnapshot = await loadDatastore("gist:abc123");

    expect(remoteSnapshot.source).toBe("remote");
    expect(cachedSnapshot.source).toBe("cache");
    expect((await readCachedDatastore("gist:abc123"))?.version).toBe("sha-latest");
  });

  it("loads a specific version", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          id: "abc123",
          files: {
            "myregulars.json": {
              content: JSON.stringify(createEmptyDocument()),
            },
          },
        }),
      ),
    );

    await expect(loadDatastoreVersion("gist:abc123", "sha-older")).resolves.toMatchObject({
      version: "sha-older",
      uri: "gist:abc123",
    });
  });

  it("saves after verifying the expected version", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(gistResponse(createEmptyDocument(), "sha-current"))
        .mockResolvedValueOnce(gistResponse(createEmptyDocument(), "sha-new")),
    );

    const snapshot = await saveDatastore({
      uri: "gist:abc123",
      expectedVersion: "sha-current",
      document: createEmptyDocument(),
      authToken: "token",
    });

    expect(snapshot.version).toBe("sha-new");
    expect(snapshot.mirror).toEqual({ status: "none" });
  });

  it("rejects conflicting saves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(gistResponse(createEmptyDocument(), "sha-current")),
    );

    await expect(
      saveDatastore({
        uri: "gist:abc123",
        expectedVersion: "sha-old",
        document: createEmptyDocument(),
        authToken: "token",
      }),
    ).rejects.toThrow(DatastoreConflictError);
  });

  it("lists datastore versions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse([
          {
            version: "abcdef123456",
            committed_at: "2026-04-23T12:00:00.000Z",
          },
        ]),
      ),
    );

    await expect(listDatastoreVersions("gist:abc123")).resolves.toEqual([
      {
        id: "abcdef123456",
        createdAt: "2026-04-23T12:00:00.000Z",
        label: "abcdef1",
      },
    ]);
  });

  describe("replicas", () => {
    const original = docWith([location("L1", "Cafe")]);
    const originalHash = contentHash(original);

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

    it("copies a gist vault to the hosted provider and links both copies", async () => {
      setGitHubAuthToken("token");
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(gistResponse(original, "sha-1"))
        .mockImplementationOnce(async (url: string, init: RequestInit) =>
          gistResponse(gistBody([url, init]), "sha-2"),
        );
      vi.stubGlobal("fetch", fetchMock);
      vaultsCreate.mockImplementationOnce(async (body: { document: MyRegularsDocument }) => ({
        id: "rec9",
        owner: "u",
        name: body.document.name,
        document: body.document,
        created: "2026-04-23T12:00:00.000Z",
        updated: "pb-1",
      }));

      const result = await copyDatastore("gist:abc123", "hosted");

      // Target carries the source's content, a pointer back, and the agreed base.
      const targetDoc = vaultsCreate.mock.calls[0][0].document as MyRegularsDocument;
      expect(targetDoc.id).toBe("v1");
      expect(targetDoc.replicas).toEqual({ gist: { id: "abc123" } });
      expect(targetDoc.sync?.base).toBe(originalHash);
      expect(contentHash(targetDoc)).toBe(originalHash);

      // Source is re-written with a pointer to the new copy.
      const sourceDoc = gistBody(fetchMock.mock.calls[1]);
      expect(sourceDoc.replicas).toEqual({ hosted: { id: "rec9" } });
      expect(sourceDoc.sync?.base).toBe(originalHash);

      expect(result.target.uri).toBe("hosted:rec9");
      expect(result.source.version).toBe("sha-2");
      expect(result.hash).toBe(originalHash);

      const entry = getRegistryEntry("v1");
      expect(entry?.replicas).toEqual({
        gist: { uri: "gist:abc123" },
        hosted: { uri: "hosted:rec9" },
      });
      expect(entry?.agreed).toBe(originalHash);
    });

    it("refuses to copy onto the same provider or over an existing copy", async () => {
      await expect(copyDatastore("gist:abc123", "gist")).rejects.toThrow(/own provider/);

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            gistResponse(withReplicaLink(original, "hosted", "rec9"), "sha-1"),
          ),
      );
      await expect(copyDatastore("gist:abc123", "hosted")).rejects.toThrow(/already has a copy/);
    });

    it("mirrors a save onto the sibling when the sibling is still on the agreed content", async () => {
      linkRegistry(originalHash);
      const edited = docWith([location("L1", "Cafe"), location("L2", "Bar")]);
      const editedHash = contentHash(edited);

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(gistResponse(original, "sha-current"))
          .mockResolvedValueOnce(gistResponse(edited, "sha-new")),
      );
      vaultsGetOne.mockResolvedValueOnce({
        owner: "u",
        document: withSyncBase(withReplicaLink(original, "gist", "abc123"), originalHash),
        updated: "pb-1",
      });
      vaultsUpdate.mockResolvedValueOnce({ owner: "u", updated: "pb-2" });

      const result = await saveDatastore({
        uri: "gist:abc123",
        expectedVersion: "sha-current",
        document: edited,
        authToken: "token",
      });

      expect(result.version).toBe("sha-new");
      expect(result.mirror).toEqual({ status: "mirrored", provider: "hosted", hash: editedHash });

      const [, body, options] = vaultsUpdate.mock.calls[0] as [
        string,
        { document: MyRegularsDocument; expectedUpdated?: string },
        unknown,
      ];
      expect(body.expectedUpdated).toBe("pb-1");
      expect(contentHash(body.document)).toBe(editedHash);
      expect(body.document.sync?.base).toBe(editedHash);
      expect(body.document.replicas).toEqual({ gist: { id: "abc123" } });
      expect(options).toBeUndefined();

      expect(getRegistryEntry("v1")?.agreed).toBe(editedHash);
      expect(getRegistryEntry("v1")?.pendingMirror).toBeUndefined();
    });

    it("records a pending mirror instead of overwriting a sibling that also changed", async () => {
      linkRegistry(originalHash);
      const edited = docWith([location("L1", "Cafe"), location("L2", "Bar")]);
      const siblingEdited = docWith([location("L1", "Cafe"), location("L3", "Gym")]);

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(gistResponse(original, "sha-current"))
          .mockResolvedValueOnce(gistResponse(edited, "sha-new")),
      );
      vaultsGetOne.mockResolvedValueOnce({ owner: "u", document: siblingEdited, updated: "pb-1" });

      const result = await saveDatastore({
        uri: "gist:abc123",
        expectedVersion: "sha-current",
        document: edited,
        authToken: "token",
      });

      expect(result.version).toBe("sha-new");
      expect(result.mirror).toEqual({ status: "pending", provider: "hosted", reason: "diverged" });
      expect(vaultsUpdate).not.toHaveBeenCalled();
      expect(getRegistryEntry("v1")?.pendingMirror).toBe("hosted");
      expect(getRegistryEntry("v1")?.agreed).toBe(originalHash);
    });

    it("records a pending mirror when the sibling cannot be reached", async () => {
      linkRegistry(originalHash);
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(gistResponse(original, "sha-current"))
          .mockResolvedValueOnce(gistResponse(original, "sha-new")),
      );
      vaultsGetOne.mockRejectedValueOnce(new Error("offline"));

      const result = await saveDatastore({
        uri: "gist:abc123",
        expectedVersion: "sha-current",
        document: original,
        authToken: "token",
      });

      expect(result.mirror).toEqual({ status: "pending", provider: "hosted", reason: "error" });
    });

    it("syncDatastoreReplicas fast-forwards only the sides it is allowed to touch", async () => {
      linkRegistry(originalHash);
      const siblingEdited = docWith([location("L1", "Cafe"), location("L3", "Gym")]);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(gistResponse(withSyncBase(original, originalHash), "sha-1")),
      );
      vaultsGetOne.mockResolvedValueOnce({ owner: "u", document: siblingEdited, updated: "pb-1" });

      // Opening the gist copy: the gist is behind, but we only allow writing hosted.
      const result = await syncDatastoreReplicas("gist:abc123", { applyTo: ["hosted"] });

      expect(result.status).toEqual({
        kind: "fastForward",
        from: "hosted",
        to: "gist",
        hash: contentHash(siblingEdited),
      });
      expect(result.applied).toBe(false);
      expect(result.sibling.document.data.locations.map((l) => l.id)).toEqual(["L1", "L3"]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it("syncDatastoreReplicas writes the behind side when allowed", async () => {
      linkRegistry(originalHash);
      const edited = docWith([location("L1", "Cafe"), location("L2", "Bar")]);
      setGitHubAuthToken("token");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(gistResponse(withSyncBase(edited, originalHash), "sha-1")),
      );
      vaultsGetOne.mockResolvedValueOnce({
        owner: "u",
        document: withSyncBase(original, originalHash),
        updated: "pb-1",
      });
      vaultsUpdate.mockResolvedValueOnce({ owner: "u", updated: "pb-2" });

      const result = await syncDatastoreReplicas("gist:abc123");

      expect(result.applied).toBe(true);
      expect(result.sibling.version).toBe("pb-2");
      expect(contentHash(result.sibling.document)).toBe(contentHash(edited));
      expect(getRegistryEntry("v1")?.agreed).toBe(contentHash(edited));
    });

    it("refuses to delete a copy whose sibling differs", async () => {
      linkRegistry(originalHash);
      setGitHubAuthToken("token");
      const siblingEdited = docWith([location("L3", "Gym")]);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(gistResponse(original, "sha-1")));
      vaultsGetOne.mockResolvedValueOnce({ owner: "u", document: siblingEdited, updated: "pb-1" });

      await expect(deleteDatastore("gist:abc123")).rejects.toThrow(DatastoreNotInSyncError);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
      expect(getRegistryEntry("v1")?.replicas.gist).toBeDefined();
    });

    it("deletes an in-sync copy, unlinks the survivor and forgets the copy locally", async () => {
      linkRegistry(originalHash);
      setGitHubAuthToken("token");
      const linkedSibling = withSyncBase(withReplicaLink(original, "gist", "abc123"), originalHash);

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(gistResponse(withReplicaLink(original, "hosted", "rec9"), "sha-1"))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);
      vaultsGetOne.mockResolvedValueOnce({ owner: "u", document: linkedSibling, updated: "pb-1" });
      vaultsUpdate.mockResolvedValueOnce({ owner: "u", updated: "pb-2" });

      await deleteDatastore("gist:abc123");

      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
      const [, body] = vaultsUpdate.mock.calls[0] as [string, { document: MyRegularsDocument }];
      expect(body.document.replicas).toBeUndefined();
      expect(body.document.sync).toBeUndefined();

      const entry = getRegistryEntry("v1");
      expect(entry?.replicas).toEqual({ hosted: { uri: "hosted:rec9" } });
      expect(entry?.primary).toBe("hosted");
      expect(await readCachedDatastore("gist:abc123")).toBeNull();
    });

    it("deletes a lone copy and drops its registry entry", async () => {
      upsertRegistryEntry({
        id: "v1",
        name: "Home",
        replicas: { gist: { uri: "gist:abc123" } },
        primary: "gist",
        lastOpened: "x",
        peopleCount: 0,
        locationCount: 0,
      });
      setGitHubAuthToken("token");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(gistResponse(original, "sha-1"))
          .mockResolvedValueOnce(new Response(null, { status: 204 })),
      );

      await deleteDatastore("gist:abc123");

      expect(getRegistryEntry("v1")).toBeNull();
      expect(vaultsGetOne).not.toHaveBeenCalled();
    });
  });
});
