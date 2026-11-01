import { beforeEach, describe, expect, it } from "vitest";

import { createDatastoreCache, type OutboxEntry } from "@/lib/datastore/cache";
import type { DatastoreSnapshot } from "@/lib/datastore/types";

function createSnapshot(): DatastoreSnapshot {
  return {
    uri: "gist:abc123",
    version: "sha-1",
    source: "remote",
    document: {
      app: "myregulars",
      schemaVersion: 2,
      id: "vault-1",
      updatedAt: "2026-04-23T12:00:00.000Z",
      data: {
        locations: [],
      },
    },
  };
}

function createOutboxEntry(): OutboxEntry {
  return {
    uri: "gist:abc123",
    document: createSnapshot().document,
    expectedVersion: "sha-1",
    updatedAt: "2026-04-23T12:05:00.000Z",
  };
}

/** Minimal IndexedDB fake: one keyed map per object store, get/put/delete. */
function createFakeIndexedDb(): { factory: IDBFactory; stores: Map<string, Map<string, unknown>> } {
  const stores = new Map<string, Map<string, unknown>>();
  const storeFor = (name: string) => {
    let store = stores.get(name);
    if (!store) {
      store = new Map();
      stores.set(name, store);
    }
    return store;
  };

  const factory = {
    cmp(first: IDBValidKey, second: IDBValidKey) {
      return first === second ? 0 : first > second ? 1 : -1;
    },
    deleteDatabase() {
      throw new Error("Not implemented.");
    },
    databases: async () => [],
    open() {
      const request = {} as IDBOpenDBRequest;
      const database = {
        close() {},
        createObjectStore(name: string) {
          storeFor(name);
          return {} as IDBObjectStore;
        },
        objectStoreNames: {
          contains: (name: string) => stores.has(name),
          item: () => null,
          length: stores.size,
          [Symbol.iterator]: function* iterator() {},
        } as DOMStringList,
        transaction(storeName: string) {
          const records = storeFor(storeName);
          const transaction = {
            error: null,
            onabort: null,
            oncomplete: null,
            onerror: null,
            abort() {},
            commit() {},
            db: {} as IDBDatabase,
            durability: "default",
            mode: "readonly",
            objectStore() {
              return {
                get(key: string) {
                  const getRequest = {} as IDBRequest<unknown>;
                  queueMicrotask(() => {
                    (getRequest as { result: unknown }).result = records.get(key);
                    getRequest.onsuccess?.(new Event("success"));
                  });
                  return getRequest;
                },
                put(value: { uri: string }) {
                  const putRequest = {} as IDBRequest<IDBValidKey>;
                  queueMicrotask(() => {
                    records.set(value.uri, value);
                    (putRequest as { result: IDBValidKey }).result = value.uri;
                    putRequest.onsuccess?.(new Event("success"));
                    transaction.oncomplete?.(new Event("complete"));
                  });
                  return putRequest;
                },
                delete(key: string) {
                  const deleteRequest = {} as IDBRequest<undefined>;
                  queueMicrotask(() => {
                    records.delete(key);
                    deleteRequest.onsuccess?.(new Event("success"));
                    transaction.oncomplete?.(new Event("complete"));
                  });
                  return deleteRequest;
                },
              } as unknown as IDBObjectStore;
            },
          } as unknown as IDBTransaction;

          return transaction;
        },
      } as unknown as IDBDatabase;

      queueMicrotask(() => {
        (request as { result: IDBDatabase }).result = database;
        // Mirror the real API: a fresh database runs the upgrade first.
        if (stores.size === 0) request.onupgradeneeded?.(new Event("upgradeneeded") as never);
        request.onsuccess?.(new Event("success"));
      });

      return request;
    },
  } as unknown as IDBFactory;

  return { factory, stores };
}

describe("datastore cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores the preferred datastore URI in localStorage", () => {
    const cache = createDatastoreCache();
    cache.setPreferredUri("gist:abc123");

    expect(cache.getPreferredUri()).toBe("gist:abc123");
  });

  it("round-trips a hosted preferred URI", () => {
    const cache = createDatastoreCache();
    cache.setPreferredUri("hosted:rec123");

    expect(cache.getPreferredUri()).toBe("hosted:rec123");
  });

  it("ignores a preferred URI with an unknown scheme", () => {
    localStorage.setItem("myregulars:datastore-uri", "dropbox:abc");
    const cache = createDatastoreCache();

    expect(cache.getPreferredUri()).toBeNull();
  });

  it("falls back to memory when indexedDB is unavailable", async () => {
    const cache = createDatastoreCache({
      indexedDB: undefined,
      localStorage,
    });
    const snapshot = createSnapshot();

    await cache.set(snapshot);

    expect(await cache.get(snapshot.uri)).toEqual(snapshot);
  });

  it("stores and retrieves snapshots through indexedDB when available", async () => {
    const { factory, stores } = createFakeIndexedDb();
    const cache = createDatastoreCache({ indexedDB: factory, localStorage });
    const snapshot = createSnapshot();

    await cache.set(snapshot);

    expect(await cache.get(snapshot.uri)).toEqual(snapshot);
    expect(stores.get("snapshots")?.has("gist:abc123")).toBe(true);
    // The upgrade created both stores.
    expect(stores.has("outbox")).toBe(true);
  });

  it("removes a snapshot, its outbox entry, and the preference pointing at it", async () => {
    const { factory } = createFakeIndexedDb();
    const cache = createDatastoreCache({ indexedDB: factory, localStorage });
    const snapshot = createSnapshot();

    await cache.set(snapshot);
    await cache.setOutbox(createOutboxEntry());
    cache.setPreferredUri(snapshot.uri);
    await cache.remove(snapshot.uri);

    expect(await cache.get(snapshot.uri)).toBeNull();
    expect(await cache.getOutbox(snapshot.uri)).toBeNull();
    expect(cache.getPreferredUri()).toBeNull();
  });

  it("keeps outbox entries separate from snapshots", async () => {
    const { factory } = createFakeIndexedDb();
    const cache = createDatastoreCache({ indexedDB: factory, localStorage });
    const entry = createOutboxEntry();

    expect(await cache.getOutbox(entry.uri)).toBeNull();
    await cache.setOutbox(entry);

    expect(await cache.getOutbox(entry.uri)).toEqual(entry);
    expect(await cache.get(entry.uri)).toBeNull();

    await cache.clearOutbox(entry.uri);
    expect(await cache.getOutbox(entry.uri)).toBeNull();
  });

  it("keeps outbox entries in memory when indexedDB is unavailable", async () => {
    const cache = createDatastoreCache({ indexedDB: undefined, localStorage });
    const entry = createOutboxEntry();

    await cache.setOutbox(entry);
    expect(await cache.getOutbox(entry.uri)).toEqual(entry);
  });
});
