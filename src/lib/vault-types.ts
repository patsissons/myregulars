import type { DatastoreProviderId, Location } from "@/lib/datastore/types";
import type { DatastoreUri } from "@/lib/datastore/types";

export interface Vault {
  name: string;
  locations: Location[];
}

export interface KnownVault {
  uri: DatastoreUri;
  provider: DatastoreProviderId;
  name: string;
  lastOpened: string;
  peopleCount: number;
  locationCount: number;
}
