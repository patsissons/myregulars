import { beforeEach, describe, expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";

import { PocketBaseStorageAdapter } from "@/lib/datastore/pocketbase-adapter";
import {
  AuthRequiredError,
  DatastoreConflictError,
  DatastoreValidationError,
} from "@/lib/datastore/errors";
import { createEmptyDocument } from "@/lib/datastore/schema";
import type { MyRegularsDocument } from "@/lib/datastore/types";

function createService() {
  return {
    create: vi.fn(),
    getOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
  return createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"), { id: "v1", name });
}

describe("PocketBaseStorageAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a vault record (snapshots are written server-side)", async () => {
    const { client, vaults, snapshots } = createFakeClient();
    const document = namedDocument("");

    vaults.create.mockResolvedValueOnce({
      id: "rec123",
      owner: "user1",
      name: "",
      document,
      created: "2026-04-23T12:00:00.000Z",
      updated: "2026-04-23T12:00:00.000Z",
    });

    const adapter = new PocketBaseStorageAdapter({ client });
    const result = await adapter.create(document);

    expect(result.uri).toBe("hosted:rec123");
    expect(result.version).toBe("2026-04-23T12:00:00.000Z");
    expect(vaults.create).toHaveBeenCalledWith({ owner: "user1", name: "", document });
    expect(snapshots.create).not.toHaveBeenCalled();
    expect(adapter.getOwnerId()).toBe("user1");
  });

  it("reads the current record and uses `updated` as the version", async () => {
    const { client, vaults } = createFakeClient();
    const document = createEmptyDocument();

    vaults.getOne.mockResolvedValueOnce({
      owner: "u9",
      public: true,
      document,
      updated: "v-current",
    });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const result = await adapter.read();

    expect(vaults.getOne).toHaveBeenCalledWith("rec123");
    expect(result.version).toBe("v-current");
    expect(result.data).toEqual(document);
    expect(adapter.getOwnerId()).toBe("u9");
    expect(adapter.isPublic()).toBe(true);
  });

  it("upgrades a legacy v1 record with an id derived from the record", async () => {
    const { client, vaults } = createFakeClient();
    vaults.getOne.mockResolvedValueOnce({
      owner: "user1",
      document: {
        app: "myregulars",
        schemaVersion: 1,
        updatedAt: "2026-04-23T12:00:00.000Z",
        data: { locations: [] },
      },
      updated: "v",
    });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const result = await adapter.read();

    expect(result.data.schemaVersion).toBe(2);
    expect(result.data.id).toBe("hosted-rec123");
  });

  it("writes the document in one request, passing the expected version for the server check", async () => {
    const { client, vaults, snapshots } = createFakeClient();
    const document = namedDocument("Home");

    vaults.update.mockResolvedValueOnce({ owner: "user1", updated: "v-next" });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const version = await adapter.write(document, { expectedVersion: "v-current" });

    expect(version).toBe("v-next");
    expect(vaults.update).toHaveBeenCalledWith(
      "rec123",
      { name: "Home", document, expectedUpdated: "v-current" },
      undefined,
    );
    expect(snapshots.create).not.toHaveBeenCalled();
  });

  it("omits expectedUpdated when no version is given and forwards keepalive", async () => {
    const { client, vaults } = createFakeClient();
    vaults.update.mockResolvedValueOnce({ updated: "v-next" });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    await adapter.write(namedDocument("Home"), { keepalive: true });

    expect(vaults.update).toHaveBeenCalledWith(
      "rec123",
      { name: "Home", document: expect.anything() },
      { keepalive: true },
    );
  });

  it("maps a 409 from the server hook to DatastoreConflictError", async () => {
    const { client, vaults } = createFakeClient();
    vaults.update.mockRejectedValueOnce({ status: 409, response: {} });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");

    await expect(
      adapter.write(namedDocument("Home"), { expectedVersion: "stale" }),
    ).rejects.toThrow(DatastoreConflictError);
  });

  it("rethrows other write errors untouched", async () => {
    const { client, vaults } = createFakeClient();
    vaults.update.mockRejectedValueOnce({ status: 500, response: {} });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");

    await expect(adapter.write(namedDocument("Home"))).rejects.toMatchObject({ status: 500 });
  });

  it("deletes the vault record", async () => {
    const { client, vaults } = createFakeClient();
    vaults.delete.mockResolvedValueOnce(true);

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    await adapter.delete();

    expect(vaults.delete).toHaveBeenCalledWith("rec123");
  });

  it("toggles public and returns the new version", async () => {
    const { client, vaults } = createFakeClient();
    vaults.update.mockResolvedValueOnce({ public: true, updated: "v-pub" });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");

    await expect(adapter.setPublic(true)).resolves.toBe("v-pub");
    expect(vaults.update).toHaveBeenCalledWith("rec123", { public: true });
    expect(adapter.isPublic()).toBe(true);
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

  it("reads a historical version and reports the vault token it was taken at", async () => {
    const { client, snapshots } = createFakeClient();
    const document = namedDocument("Old");

    snapshots.getOne.mockResolvedValueOnce({ document, vault_updated: "v-at-snapshot" });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");
    const result = await adapter.readVersion("snap1");

    expect(snapshots.getOne).toHaveBeenCalledWith("snap1");
    expect(result.version).toBe("v-at-snapshot");
    expect(result.data).toEqual(document);
  });

  it("falls back to the snapshot id for snapshots written before vault_updated existed", async () => {
    const { client, snapshots } = createFakeClient();
    snapshots.getOne.mockResolvedValueOnce({ document: namedDocument("Old") });

    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");

    expect((await adapter.readVersion("snap1")).version).toBe("snap1");
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

  it("requires an authenticated user for create, write and delete", async () => {
    const { client } = createFakeClient({ userId: null });
    const adapter = new PocketBaseStorageAdapter({ client });
    await adapter.connect("hosted:rec123");

    await expect(adapter.create(createEmptyDocument())).rejects.toThrow(AuthRequiredError);
    await expect(adapter.write(createEmptyDocument())).rejects.toThrow(AuthRequiredError);
    await expect(adapter.delete()).rejects.toThrow(AuthRequiredError);
  });

  it("throws before a uri is connected", () => {
    const { client } = createFakeClient();
    const adapter = new PocketBaseStorageAdapter({ client });

    expect(() => adapter.getUri()).toThrow(DatastoreValidationError);
  });
});
