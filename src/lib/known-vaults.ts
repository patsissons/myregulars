import { legacyVaultId } from "@/lib/datastore/migrate";
import {
  findRegistryEntryByUri,
  getRegistry,
  getRegistryEntry,
  unlinkReplica,
  updateRegistryEntry,
  upsertRegistryEntry,
  type VaultRegistryEntry,
} from "@/lib/datastore/registry";
import { replicaUri } from "@/lib/datastore/sync";
import { getProviderFromUri } from "@/lib/datastore/uri";
import type { DatastoreProviderId, DatastoreUri } from "@/lib/datastore/types";
import type { KnownVault } from "@/lib/vault-types";

/**
 * Per-provider-URI view over the vault registry, kept so existing callers
 * that think in terms of "the vault at this URI" keep working. One registry
 * entry (logical vault) surfaces as one KnownVault at its primary copy's URI.
 */

function toKnownVault(entry: VaultRegistryEntry): KnownVault | null {
  const primary = entry.replicas[entry.primary]?.uri;
  const fallback = Object.values(entry.replicas).find((replica) => replica?.uri)?.uri;
  const uri = primary ?? fallback;
  if (!uri) return null;

  return {
    id: entry.id,
    uri,
    provider: getProviderFromUri(uri),
    name: entry.name,
    lastOpened: entry.lastOpened,
    peopleCount: entry.peopleCount,
    locationCount: entry.locationCount,
    replicas: Object.fromEntries(
      Object.entries(entry.replicas).map(([provider, replica]) => [
        provider,
        { id: replica!.uri.slice(replica!.uri.indexOf(":") + 1) },
      ]),
    ),
  };
}

export function getKnownVaults(): KnownVault[] {
  return getRegistry()
    .map(toKnownVault)
    .filter((vault): vault is KnownVault => vault !== null);
}

/**
 * Records a vault as opened at `info.uri` and makes that copy the primary.
 * Replica links carried on `info.replicas` (from the document) are merged so
 * a device that only ever opened one copy still learns about the other.
 */
export function addKnownVault(info: KnownVault): void {
  const provider = getProviderFromUri(info.uri);
  const existing = findRegistryEntryByUri(info.uri) ?? (info.id ? getRegistryEntry(info.id) : null);
  const id = existing?.id ?? info.id ?? legacyVaultId(info.uri);

  const replicas: VaultRegistryEntry["replicas"] = {
    ...existing?.replicas,
    [provider]: { uri: info.uri },
  };
  for (const [otherProvider, ref] of Object.entries(info.replicas ?? {})) {
    if (!ref || otherProvider === provider) continue;
    const key = otherProvider as DatastoreProviderId;
    replicas[key] = replicas[key] ?? { uri: replicaUri(key, ref.id) };
  }

  upsertRegistryEntry({
    ...existing,
    id,
    name: info.name,
    replicas,
    primary: provider,
    lastOpened: info.lastOpened,
    peopleCount: info.peopleCount,
    locationCount: info.locationCount,
  });
}

/** Forgets one copy; the logical vault stays if another copy is known. */
export function removeKnownVault(uri: DatastoreUri): void {
  const entry = findRegistryEntryByUri(uri);
  if (!entry) return;
  unlinkReplica(entry.id, getProviderFromUri(uri));
}

export function updateKnownVault(
  uri: DatastoreUri,
  updates: Partial<Omit<KnownVault, "uri" | "id" | "replicas" | "provider">>,
): void {
  const entry = findRegistryEntryByUri(uri);
  if (!entry) return;
  updateRegistryEntry(entry.id, updates);
}
