export type DatastoreUri = `gist:${string}`;

export type LocationRecord = Record<string, unknown>;

export interface MyRegularsDocument {
  app: "myregulars";
  schemaVersion: 1;
  updatedAt: string;
  data: {
    locations: LocationRecord[];
  };
}

export interface DatastoreConnection {
  uri: DatastoreUri;
  gistId: string;
  shareUrl: string;
}

export interface DatastoreSnapshot {
  document: MyRegularsDocument;
  version: string;
  uri: DatastoreUri;
  source: "remote" | "cache";
}

export interface VersionInfo {
  id: string;
  createdAt: string;
  label: string;
}

export interface StorageAdapter<TDocument> {
  connect(uri: string): Promise<void>;
  create(): Promise<{ uri: DatastoreUri; data: TDocument; version: string }>;
  read(): Promise<{ data: TDocument; version: string }>;
  readVersion(version: string): Promise<{ data: TDocument; version: string }>;
  write(data: TDocument): Promise<string>;
  listVersions(): Promise<VersionInfo[]>;
  getUri(): DatastoreUri;
}
