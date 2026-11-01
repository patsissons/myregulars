import PocketBase from "pocketbase";

import {
  AuthRequiredError,
  DatastoreConflictError,
  DatastoreValidationError,
} from "@/lib/datastore/errors";
import { getPocketBaseClient } from "@/lib/datastore/pocketbase-config";
import { createEmptyDocument, parseDocument } from "@/lib/datastore/schema";
import { formatHostedUri, getHostedIdFromUri, normalizeDatastoreUri } from "@/lib/datastore/uri";
import type {
  DatastoreUri,
  DiscoveredVault,
  MyRegularsDocument,
  StorageAdapter,
  VersionInfo,
  WriteOptions,
} from "@/lib/datastore/types";

export const VAULTS_COLLECTION = "vaults";
export const VAULT_SNAPSHOTS_COLLECTION = "vault_snapshots";

interface VaultRecord {
  id: string;
  owner: string;
  name?: string;
  public?: boolean;
  document: unknown;
  created: string;
  updated: string;
}

interface SnapshotRecord {
  id: string;
  vault: string;
  owner: string;
  document: unknown;
  /** The vault's `updated` token when this snapshot was taken (set by the server hook). */
  vault_updated?: string;
  created: string;
}

interface PocketBaseStorageAdapterOptions {
  /** Override the shared client (used in tests). */
  client?: PocketBase;
}

function errorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : null;
  }
  return null;
}

/**
 * Stores each vault as a record in the `vaults` collection of a PocketBase
 * instance. The record's `updated` autodate field is the optimistic-concurrency
 * version token. Snapshots (`vault_snapshots`) are written server-side by
 * `pocketbase/pb_hooks/vaults.pb.js` on every document change, so a save is a
 * single request and history can never be left half-written.
 */
export class PocketBaseStorageAdapter implements StorageAdapter<MyRegularsDocument> {
  private readonly injectedClient: PocketBase | null;
  private uri: DatastoreUri | null = null;
  private lastOwnerId: string | null = null;
  private lastPublic = false;

  constructor(options: PocketBaseStorageAdapterOptions = {}) {
    this.injectedClient = options.client ?? null;
  }

  async connect(uri: string): Promise<void> {
    this.uri = normalizeDatastoreUri(uri);
  }

  async create(
    initial?: MyRegularsDocument,
  ): Promise<{ uri: DatastoreUri; data: MyRegularsDocument; version: string }> {
    const client = this.getClient();
    const ownerId = this.requireUserId(client);
    const seed = initial ?? createEmptyDocument();

    const record = await client.collection<VaultRecord>(VAULTS_COLLECTION).create({
      owner: ownerId,
      name: seed.name ?? "",
      document: seed,
    });

    this.uri = formatHostedUri(record.id);
    this.remember(record);

    return {
      uri: this.getUri(),
      data: parseDocument(record.document, { uri: this.uri }),
      version: record.updated,
    };
  }

  async read(): Promise<{ data: MyRegularsDocument; version: string }> {
    const client = this.getClient();
    const record = await client
      .collection<VaultRecord>(VAULTS_COLLECTION)
      .getOne(this.getRecordId());
    this.remember(record);

    return {
      data: parseDocument(record.document, { uri: this.getUri() }),
      version: record.updated,
    };
  }

  async readVersion(version: string): Promise<{ data: MyRegularsDocument; version: string }> {
    const client = this.getClient();
    // For hosted vaults a "version" is a snapshot record id (see listVersions).
    const snapshot = await client
      .collection<SnapshotRecord>(VAULT_SNAPSHOTS_COLLECTION)
      .getOne(version);

    return {
      data: parseDocument(snapshot.document, { uri: this.getUri() }),
      version: snapshot.vault_updated || version,
    };
  }

  async write(data: MyRegularsDocument, options: WriteOptions = {}): Promise<string> {
    const client = this.getClient();
    this.requireUserId(client);
    const recordId = this.getRecordId();

    try {
      const record = await client.collection<VaultRecord>(VAULTS_COLLECTION).update(
        recordId,
        {
          name: data.name ?? "",
          document: data,
          // Enforced by the server hook: rejected with 409 when the record's
          // `updated` no longer matches.
          ...(options.expectedVersion ? { expectedUpdated: options.expectedVersion } : {}),
        },
        options.keepalive ? { keepalive: true } : undefined,
      );
      this.remember(record);
      return record.updated;
    } catch (error) {
      if (errorStatus(error) === 409) {
        throw new DatastoreConflictError();
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const client = this.getClient();
    this.requireUserId(client);
    // Snapshots cascade with the vault record.
    await client.collection<VaultRecord>(VAULTS_COLLECTION).delete(this.getRecordId());
  }

  async setPublic(flag: boolean): Promise<string> {
    const client = this.getClient();
    this.requireUserId(client);
    const record = await client
      .collection<VaultRecord>(VAULTS_COLLECTION)
      .update(this.getRecordId(), { public: flag });
    this.remember(record);
    return record.updated;
  }

  getOwnerId(): string | null {
    return this.lastOwnerId;
  }

  isPublic(): boolean {
    return this.lastPublic;
  }

  async listVersions(): Promise<VersionInfo[]> {
    const client = this.getClient();
    const recordId = this.getRecordId();

    const snapshots = await client
      .collection<SnapshotRecord>(VAULT_SNAPSHOTS_COLLECTION)
      .getFullList({
        filter: client.filter("vault = {:vault}", { vault: recordId }),
        sort: "-created",
      });

    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      createdAt: snapshot.created,
      label: snapshot.id.slice(0, 7),
    }));
  }

  async discover(): Promise<DiscoveredVault[]> {
    const client = this.getClient();
    const ownerId = this.requireUserId(client);

    const records = await client.collection<VaultRecord>(VAULTS_COLLECTION).getFullList({
      filter: client.filter("owner = {:owner}", { owner: ownerId }),
      sort: "-updated",
    });

    return records.map((record) => ({
      uri: formatHostedUri(record.id),
      name: this.resolveName(record),
      fileName: "",
      updatedAt: record.updated,
    }));
  }

  getUri(): DatastoreUri {
    if (!this.uri) {
      throw new DatastoreValidationError("No datastore URI has been connected yet.");
    }

    return this.uri;
  }

  private remember(record: Partial<VaultRecord>): void {
    if (typeof record.owner === "string") this.lastOwnerId = record.owner;
    if (typeof record.public === "boolean") this.lastPublic = record.public;
  }

  private resolveName(record: VaultRecord): string | null {
    try {
      const documentName = parseDocument(record.document, {
        uri: formatHostedUri(record.id),
      }).name?.trim();
      if (documentName) {
        return documentName;
      }
    } catch {
      // Fall back to the record's name column below.
    }

    return record.name?.trim() || null;
  }

  private getClient(): PocketBase {
    return this.injectedClient ?? getPocketBaseClient();
  }

  private getRecordId(): string {
    return getHostedIdFromUri(this.getUri());
  }

  private requireUserId(client: PocketBase): string {
    const record = client.authStore.record;

    if (!record?.id || !client.authStore.isValid) {
      throw new AuthRequiredError("A signed-in account is required for hosted vaults.");
    }

    return record.id;
  }
}
