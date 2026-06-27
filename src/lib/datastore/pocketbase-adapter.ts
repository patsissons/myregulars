import PocketBase from "pocketbase";

import { AuthRequiredError, DatastoreValidationError } from "@/lib/datastore/errors";
import { getPocketBaseClient } from "@/lib/datastore/pocketbase-config";
import { createEmptyDocument, parseDocument } from "@/lib/datastore/schema";
import { formatHostedUri, getHostedIdFromUri, normalizeDatastoreUri } from "@/lib/datastore/uri";
import type {
  DatastoreUri,
  DiscoveredVault,
  MyRegularsDocument,
  StorageAdapter,
  VersionInfo,
} from "@/lib/datastore/types";

export const VAULTS_COLLECTION = "vaults";
export const VAULT_SNAPSHOTS_COLLECTION = "vault_snapshots";

interface VaultRecord {
  id: string;
  owner: string;
  name?: string;
  document: unknown;
  created: string;
  updated: string;
}

interface SnapshotRecord {
  id: string;
  vault: string;
  owner: string;
  document: unknown;
  created: string;
}

interface PocketBaseStorageAdapterOptions {
  /** Override the shared client (used in tests). */
  client?: PocketBase;
}

/**
 * Stores each vault as a record in the `vaults` collection of a PocketBase
 * instance. The record's `updated` autodate field is the optimistic-concurrency
 * version token; every write also appends a `vault_snapshots` row so history
 * (listVersions/readVersion) mirrors the gist provider.
 */
export class PocketBaseStorageAdapter implements StorageAdapter<MyRegularsDocument> {
  private readonly injectedClient: PocketBase | null;
  private uri: DatastoreUri | null = null;

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
    await this.appendSnapshot(client, record.id, ownerId, seed);

    return {
      uri: this.getUri(),
      data: parseDocument(record.document),
      version: record.updated,
    };
  }

  async read(): Promise<{ data: MyRegularsDocument; version: string }> {
    const client = this.getClient();
    const record = await client
      .collection<VaultRecord>(VAULTS_COLLECTION)
      .getOne(this.getRecordId());

    return {
      data: parseDocument(record.document),
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
      data: parseDocument(snapshot.document),
      version,
    };
  }

  async write(data: MyRegularsDocument): Promise<string> {
    const client = this.getClient();
    const ownerId = this.requireUserId(client);
    const recordId = this.getRecordId();

    const record = await client.collection<VaultRecord>(VAULTS_COLLECTION).update(recordId, {
      name: data.name ?? "",
      document: data,
    });

    await this.appendSnapshot(client, recordId, ownerId, data);

    return record.updated;
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

  private resolveName(record: VaultRecord): string | null {
    try {
      const documentName = parseDocument(record.document).name?.trim();
      if (documentName) {
        return documentName;
      }
    } catch {
      // Fall back to the record's name column below.
    }

    return record.name?.trim() || null;
  }

  private async appendSnapshot(
    client: PocketBase,
    vaultId: string,
    ownerId: string,
    document: MyRegularsDocument,
  ): Promise<void> {
    await client.collection<SnapshotRecord>(VAULT_SNAPSHOTS_COLLECTION).create({
      vault: vaultId,
      owner: ownerId,
      document,
    });
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
