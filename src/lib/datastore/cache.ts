import {
  DATASTORE_CACHE_DB_NAME,
  DATASTORE_CACHE_DB_VERSION,
  DATASTORE_CACHE_STORE_NAME,
  DATASTORE_PREFERENCE_KEY,
} from "@/lib/datastore/constants";
import type { DatastoreSnapshot, DatastoreUri } from "@/lib/datastore/types";

interface DatastoreCacheRecord {
  uri: DatastoreUri;
  snapshot: DatastoreSnapshot;
}

interface CacheOptions {
  indexedDB?: IDBFactory;
  localStorage?: Storage;
}

export interface DatastoreCache {
  get(uri: DatastoreUri): Promise<DatastoreSnapshot | null>;
  set(snapshot: DatastoreSnapshot): Promise<void>;
  setPreferredUri(uri: DatastoreUri): void;
  getPreferredUri(): DatastoreUri | null;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

async function openDatabase(indexedDB: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATASTORE_CACHE_DB_NAME, DATASTORE_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DATASTORE_CACHE_STORE_NAME)) {
        db.createObjectStore(DATASTORE_CACHE_STORE_NAME, { keyPath: "uri" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open datastore cache."));
  });
}

export function createDatastoreCache(options: CacheOptions = {}): DatastoreCache {
  const indexedDBFactory = options.indexedDB ?? globalThis.indexedDB;
  const storage = options.localStorage ?? globalThis.localStorage;
  const memoryFallback = new Map<DatastoreUri, DatastoreSnapshot>();

  return {
    async get(uri) {
      if (!indexedDBFactory) {
        return memoryFallback.get(uri) ?? null;
      }

      try {
        const db = await openDatabase(indexedDBFactory);
        const transaction = db.transaction(DATASTORE_CACHE_STORE_NAME, "readonly");
        const request = transaction.objectStore(DATASTORE_CACHE_STORE_NAME).get(uri);
        const record = await requestToPromise(
          request as IDBRequest<DatastoreCacheRecord | undefined>,
        );
        db.close();
        return record?.snapshot ?? null;
      } catch {
        return memoryFallback.get(uri) ?? null;
      }
    },
    async set(snapshot) {
      memoryFallback.set(snapshot.uri, snapshot);

      if (!indexedDBFactory) {
        return;
      }

      const db = await openDatabase(indexedDBFactory);
      const transaction = db.transaction(DATASTORE_CACHE_STORE_NAME, "readwrite");
      transaction.objectStore(DATASTORE_CACHE_STORE_NAME).put({
        uri: snapshot.uri,
        snapshot,
      } satisfies DatastoreCacheRecord);
      await transactionToPromise(transaction);
      db.close();
    },
    setPreferredUri(uri) {
      storage?.setItem(DATASTORE_PREFERENCE_KEY, uri);
    },
    getPreferredUri() {
      const value = storage?.getItem(DATASTORE_PREFERENCE_KEY);
      return value?.startsWith("gist:") ? (value as DatastoreUri) : null;
    },
  };
}
