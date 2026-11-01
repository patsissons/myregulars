export type DatastoreProviderId = "gist" | "hosted";

export type DatastoreUri = `gist:${string}` | `hosted:${string}`;

export interface Pet {
  name: string;
  species: string;
}

export interface VisitEntry {
  date: string;
  note?: string;
}

export interface Relationship {
  personId: string;
  kind: string;
}

export interface Person {
  id: string;
  name: string;
  detail: string;
  photoUrl?: string;
  lastSeen?: string;
  visitLog?: VisitEntry[];
  pets?: Pet[];
  relationships?: Relationship[];
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  people: Person[];
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  groups: Group[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  locations: Location[];
}

/** Pointer from one copy of a vault to its sibling in another provider. */
export interface VaultReplicaRef {
  /** Provider-specific record id (gist id or PocketBase record id). */
  id: string;
}

export type VaultReplicas = Partial<Record<DatastoreProviderId, VaultReplicaRef>>;

/**
 * Sync bookkeeping stored inside each copy. `base` is the content hash both
 * copies were last known to share at the time this copy was written; it is
 * the common ancestor used to tell "one side moved on" from "both sides moved".
 */
export interface VaultSyncMeta {
  base: string;
  at: string;
}

/** The wire format written by clients before the overhaul. Read-only; never written. */
export interface MyRegularsDocumentV1 {
  app: "myregulars";
  schemaVersion: 1;
  name?: string;
  updatedAt: string;
  data: VaultData;
}

/**
 * The current document. v1 documents are upgraded to this shape on read
 * (see `migrate.ts`); every write emits this shape.
 */
export interface MyRegularsDocument {
  app: "myregulars";
  schemaVersion: 2;
  /** Stable logical vault id shared by every copy of the vault. Not used in URLs. */
  id: string;
  name?: string;
  updatedAt: string;
  /** Sibling copies in other providers, if any. */
  replicas?: VaultReplicas;
  sync?: VaultSyncMeta;
  data: VaultData;
}

export type AnyMyRegularsDocument = MyRegularsDocumentV1 | MyRegularsDocument;

/** Where a document was read from; lets the v1 upgrade derive a stable id and name. */
export interface DocumentContext {
  uri?: DatastoreUri;
  vaultFileName?: string;
}

export interface DatastoreConnection {
  uri: DatastoreUri;
  provider: DatastoreProviderId;
  /** Provider-specific record id (gist id or PocketBase record id). */
  id: string;
  /** Present only for the gist provider; retained for back-compat. */
  gistId?: string;
  shareUrl: string;
}

export interface DatastoreSnapshot {
  document: MyRegularsDocument;
  version: string;
  uri: DatastoreUri;
  source: "remote" | "cache";
  vaultFileName?: string;
  /** Hosted only: the owning account id, used to decide read-only. */
  ownerId?: string | null;
  /** Hosted only: whether anyone with the link may read the vault. */
  isPublic?: boolean;
}

export interface VersionInfo {
  id: string;
  createdAt: string;
  label: string;
}

export interface DiscoveredVault {
  uri: DatastoreUri;
  name: string | null;
  fileName: string;
  updatedAt: string;
}

export interface WriteOptions {
  /**
   * Version token the remote copy is expected to have. Providers that support
   * conditional writes (hosted) reject the write when it no longer matches.
   */
  expectedVersion?: string;
  /** Use a keepalive request so the write survives the page being hidden/closed. */
  keepalive?: boolean;
}

export interface StorageAdapter<TDocument> {
  connect(uri: string): Promise<void>;
  create(initial?: TDocument): Promise<{ uri: DatastoreUri; data: TDocument; version: string }>;
  read(): Promise<{ data: TDocument; version: string }>;
  readVersion(version: string): Promise<{ data: TDocument; version: string }>;
  write(data: TDocument, options?: WriteOptions): Promise<string>;
  delete(): Promise<void>;
  listVersions(): Promise<VersionInfo[]>;
  discover(): Promise<DiscoveredVault[]>;
  getUri(): DatastoreUri;
  /** Optional: the detected vault file name (gist provider only). */
  getVaultFileName?(): string | null;
  /** Optional: the owning account id as of the last read (hosted provider only). */
  getOwnerId?(): string | null;
  /** Optional: whether the vault is link-readable as of the last read (hosted provider only). */
  isPublic?(): boolean;
  /** Optional: toggle link-readability. Resolves with the new version token. */
  setPublic?(flag: boolean): Promise<string>;
}
