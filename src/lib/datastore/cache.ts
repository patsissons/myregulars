import {
  DATASTORE_CACHE_DB_NAME,
  DATASTORE_CACHE_DB_VERSION,
  DATASTORE_CACHE_STORE_NAME,
  DATASTORE_OUTBOX_STORE_NAME,
  DATASTORE_PREFERENCE_KEY,
} from "@/lib/datastore/constants";
import type { DatastoreSnapshot, DatastoreUri, MyRegularsDocument } from "@/lib/datastore/types";

interface DatastoreCacheRecord {
  uri: DatastoreUri;
  snapshot: DatastoreSnapshot;
}

/**
 * Unsaved local edits, persisted so a tab that is killed before its debounced
 * save runs (common on phones) can finish the save on next open.
 */
export interface OutboxEntry {
  uri: DatastoreUri;
  document: MyRegularsDocument;
  /** The version the edits were made against; the save still conflict-checks. */
  expectedVersion: string;
  updatedAt: string;
}

interface CacheOptions {
  indexedDB?: IDBFactory;
  localStorage?: Storage;
}

export interface DatastoreCache {
  get(uri: DatastoreUri): Promise<DatastoreSnapshot | null>;
  set(snapshot: DatastoreSnapshot): Promise<void>;
  remove(uri: DatastoreUri): Promise<void>;
  getOutbox(uri: DatastoreUri): Promise<OutboxEntry | null>;
  setOutbox(entry: OutboxEntry): Promise<void>;
  clearOutbox(uri: DatastoreUri): Promise<void>;
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
      if (!db.objectStoreNames.contains(DATASTORE_OUTBOX_STORE_NAME)) {
        db.createObjectStore(DATASTORE_OUTBOX_STORE_NAME, { keyPath: "uri" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open datastore cache."));
  });
}

export function createDatastoreCache(options: CacheOptions = {}): DatastoreCache {
  const indexedDBFactory = options.indexedDB ?? globalThis.indexedDB;
  const storage = options.localStorage ?? globalThis.localStorage;
  const memorySnapshots = new Map<DatastoreUri, DatastoreSnapshot>();
  const memoryOutbox = new Map<DatastoreUri, OutboxEntry>();

  async function readRecord<T>(storeName: string, key: DatastoreUri): Promise<T | null> {
    if (!indexedDBFactory) return null;
    const db = await openDatabase(indexedDBFactory);
    try {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(key);
      const record = await requestToPromise(request as IDBRequest<T | undefined>);
      return record ?? null;
    } finally {
      db.close();
    }
  }

  async function writeRecord(storeName: string, value: unknown): Promise<void> {
    if (!indexedDBFactory) return;
    const db = await openDatabase(indexedDBFactory);
    try {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value);
      await transactionToPromise(transaction);
    } finally {
      db.close();
    }
  }

  async function deleteRecord(storeName: string, key: DatastoreUri): Promise<void> {
    if (!indexedDBFactory) return;
    const db = await openDatabase(indexedDBFactory);
    try {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(key);
      await transactionToPromise(transaction);
    } finally {
      db.close();
    }
  }

  return {
    async get(uri) {
      try {
        const record = await readRecord<DatastoreCacheRecord>(DATASTORE_CACHE_STORE_NAME, uri);
        if (record) return record.snapshot;
      } catch {
        // fall through to memory
      }
      return memorySnapshots.get(uri) ?? null;
    },
    async set(snapshot) {
      memorySnapshots.set(snapshot.uri, snapshot);
      await writeRecord(DATASTORE_CACHE_STORE_NAME, {
        uri: snapshot.uri,
        snapshot,
      } satisfies DatastoreCacheRecord);
    },
    async remove(uri) {
      memorySnapshots.delete(uri);
      memoryOutbox.delete(uri);

      try {
        await deleteRecord(DATASTORE_CACHE_STORE_NAME, uri);
        await deleteRecord(DATASTORE_OUTBOX_STORE_NAME, uri);
      } catch {
        // Best effort: a stale cache entry is harmless.
      }

      if (storage?.getItem(DATASTORE_PREFERENCE_KEY) === uri) {
        storage.removeItem(DATASTORE_PREFERENCE_KEY);
      }
    },
    async getOutbox(uri) {
      try {
        const record = await readRecord<OutboxEntry>(DATASTORE_OUTBOX_STORE_NAME, uri);
        if (record) return record;
      } catch {
        // fall through to memory
      }
      return memoryOutbox.get(uri) ?? null;
    },
    async setOutbox(entry) {
      memoryOutbox.set(entry.uri, entry);
      try {
        await writeRecord(DATASTORE_OUTBOX_STORE_NAME, entry);
      } catch {
        // The in-memory copy still covers this tab's lifetime.
      }
    },
    async clearOutbox(uri) {
      memoryOutbox.delete(uri);
      try {
        await deleteRecord(DATASTORE_OUTBOX_STORE_NAME, uri);
      } catch {
        // Best effort.
      }
    },
    setPreferredUri(uri) {
      storage?.setItem(DATASTORE_PREFERENCE_KEY, uri);
    },
    getPreferredUri() {
      const value = storage?.getItem(DATASTORE_PREFERENCE_KEY);
      return value && (value.startsWith("gist:") || value.startsWith("hosted:"))
        ? (value as DatastoreUri)
        : null;
    },
  };
}
