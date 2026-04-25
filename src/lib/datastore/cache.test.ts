import { beforeEach, describe, expect, it } from "vitest";

import { createDatastoreCache } from "@/lib/datastore/cache";
import type { DatastoreSnapshot } from "@/lib/datastore/types";

function createSnapshot(): DatastoreSnapshot {
  return {
    uri: "gist:abc123",
    version: "sha-1",
    source: "remote",
    document: {
      app: "myregulars",
      schemaVersion: 1,
      updatedAt: "2026-04-23T12:00:00.000Z",
      data: {
        venues: [],
      },
    },
  };
}

function createFakeIndexedDb(): IDBFactory {
  const records = new Map<string, unknown>();

  return {
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
        createObjectStore() {
          return {} as IDBObjectStore;
        },
        objectStoreNames: {
          contains: () => true,
          item: () => null,
          length: 1,
          [Symbol.iterator]: function* iterator() {},
        } as DOMStringList,
        transaction() {
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
              } as IDBObjectStore;
            },
          } as unknown as IDBTransaction;

          return transaction;
        },
      } as unknown as IDBDatabase;

      queueMicrotask(() => {
        (request as { result: IDBDatabase }).result = database;
        request.onsuccess?.(new Event("success"));
      });

      return request;
    },
  } as unknown as IDBFactory;
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
    const cache = createDatastoreCache({
      indexedDB: createFakeIndexedDb(),
      localStorage,
    });
    const snapshot = createSnapshot();

    await cache.set(snapshot);

    expect(await cache.get(snapshot.uri)).toEqual(snapshot);
  });
});
