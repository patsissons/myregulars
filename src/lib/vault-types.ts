import type {
  DatastoreProviderId,
  DatastoreUri,
  Location,
  VaultReplicas,
} from "@/lib/datastore/types";

export interface Vault {
  name: string;
  locations: Location[];
}

export interface KnownVault {
  /** Logical vault id (shared by all copies). Absent only for entries recorded before v2. */
  id?: string;
  uri: DatastoreUri;
  provider: DatastoreProviderId;
  name: string;
  lastOpened: string;
  peopleCount: number;
  locationCount: number;
  /** Other copies of this vault, keyed by provider. */
  replicas?: VaultReplicas;
}
