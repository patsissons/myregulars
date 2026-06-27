import { beforeEach, describe, expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";

import { PocketBaseStorageAdapter } from "@/lib/datastore/pocketbase-adapter";
import { AuthRequiredError, DatastoreValidationError } from "@/lib/datastore/errors";
import { createEmptyDocument } from "@/lib/datastore/schema";
import type { MyRegularsDocument } from "@/lib/datastore/types";

function createService() {
  return {
    create: vi.fn(),
    getOne: vi.fn(),
    update: vi.fn(),
    getFullList: vi.fn(),
  };
}

type FakeService = ReturnType<typeof createService>;

function createFakeClient(options: { userId?: string | null; isValid?: boolean } = {}) {
  const { userId = "user1", isValid = true } = options;
  const vaults = createService();
  const snapshots = createService();

  const client = {
    authStore: {
      token: "token",
      record: userId ? { id: userId } : null,
      isValid,
    },
    filter: (raw: string) => raw,
    collection: (name: string): FakeService => (name === "vaults" ? vaults : snapshots),
  } as unknown as PocketBase;

  return { client, vaults, snapshots };
}

function namedDocument(name: string): MyRegularsDocument {
  return { ...createEmptyDocument(new Date("2026-04-23T12:00:00.000Z")), name };
}

describe("PocketBaseStorageAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a vault record plus an initial snapshot", async () => {
    const { client, vaults, snapshots } = createFakeClient();
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    vaults.create.mockResolvedValueOnce({
      id: "rec123",
      owner: "user1",
      name: "",
      document,
      created: "2026-04-23T12:00:00.000Z",
      updated: "2026-04-23T12:00:00.000Z",
    });
    snapshots.create.mockResolvedValueOnce({ id: "snap1" });

    const adapter = new PocketBaseStorageAdapter({ client });
    const result = await adapter.create(document);

    expect(result.uri).toBe("hosted:rec123");
    expect(result.version).toBe("2026-04-23T12:00:00.000Z");
    expect(vaults.create).toHaveBeenCalledWith({ owner: "user1", name: "", document });
    expect(snapshots.create).toHaveBeenCalledWith({
      vault: "rec123",
      owner: "user1",
      document,
    });
  });

  it("reads the current record and uses `updated` as the version", async () => {
    const { client, vaults } = createFakeClient();
    const document = createEmptyDocument();

    vaults.getOne.mockResolvedValueOnce({ document, updated: "v-current" });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const result = await adapter.read();

    expect(vaults.getOne).toHaveBeenCalledWith("rec123");
    expect(result.version).toBe("v-current");
    expect(result.data).toEqual(document);
  });

  it("writes the document and appends a snapshot", async () => {
    const { client, vaults, snapshots } = createFakeClient();
    const document = namedDocument("Home");

    vaults.update.mockResolvedValueOnce({ updated: "v-next" });
    snapshots.create.mockResolvedValueOnce({ id: "snap2" });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const version = await adapter.write(document);

    expect(version).toBe("v-next");
    expect(vaults.update).toHaveBeenCalledWith("rec123", { name: "Home", document });
    expect(snapshots.create).toHaveBeenCalledWith({
      vault: "rec123",
      owner: "user1",
      document,
    });
  });

  it("lists snapshot versions newest-first", async () => {
    const { client, snapshots } = createFakeClient();

    snapshots.getFullList.mockResolvedValueOnce([
      { id: "snap2abc", created: "2026-04-23T13:00:00.000Z" },
      { id: "snap1abc", created: "2026-04-23T12:00:00.000Z" },
    ]);

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const versions = await adapter.listVersions();

    expect(versions).toEqual([
      { id: "snap2abc", createdAt: "2026-04-23T13:00:00.000Z", label: "snap2ab" },
      { id: "snap1abc", createdAt: "2026-04-23T12:00:00.000Z", label: "snap1ab" },
    ]);
  });

  it("reads a historical version from a snapshot id", async () => {
    const { client, snapshots } = createFakeClient();
    const document = namedDocument("Old");

    snapshots.getOne.mockResolvedValueOnce({ document });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const result = await adapter.readVersion("snap1");

    expect(snapshots.getOne).toHaveBeenCalledWith("snap1");
    expect(result.version).toBe("snap1");
    expect(result.data).toEqual(document);
  });

  it("discovers the signed-in user's vaults", async () => {
    const { client, vaults } = createFakeClient();

    vaults.getFullList.mockResolvedValueOnce([
      {
        id: "rec1",
        name: "ignored",
        document: namedDocument("Home"),
        updated: "2026-04-23T12:00:00.000Z",
      },
    ]);

    const adapter = new PocketBaseStorageAdapter({ client });
    const discovered = await adapter.discover();

    expect(discovered).toEqual([
      {
        uri: "hosted:rec1",
        name: "Home",
        fileName: "",
        updatedAt: "2026-04-23T12:00:00.000Z",
      },
    ]);
  });

  it("requires an authenticated user for create", async () => {
    const { client } = createFakeClient({ userId: null });
    const adapter = new PocketBaseStorageAdapter({ client });

    await expect(adapter.create(createEmptyDocument())).rejects.toThrow(AuthRequiredError);
  });

  it("throws before a uri is connected", () => {
    const { client } = createFakeClient();
    const adapter = new PocketBaseStorageAdapter({ client });

    expect(() => adapter.getUri()).toThrow(DatastoreValidationError);
  });
});
