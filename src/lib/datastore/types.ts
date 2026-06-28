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

export interface MyRegularsDocument {
  app: "myregulars";
  schemaVersion: 1;
  name?: string;
  updatedAt: string;
  data: {
    locations: Location[];
  };
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

export interface StorageAdapter<TDocument> {
  connect(uri: string): Promise<void>;
  create(initial?: TDocument): Promise<{ uri: DatastoreUri; data: TDocument; version: string }>;
  read(): Promise<{ data: TDocument; version: string }>;
  readVersion(version: string): Promise<{ data: TDocument; version: string }>;
  write(data: TDocument): Promise<string>;
  listVersions(): Promise<VersionInfo[]>;
  discover(): Promise<DiscoveredVault[]>;
  getUri(): DatastoreUri;
  /** Optional: the detected vault file name (gist provider only). */
  getVaultFileName?(): string | null;
}
