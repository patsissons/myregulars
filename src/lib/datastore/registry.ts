import { KNOWN_VAULTS_LEGACY_KEY, VAULT_REGISTRY_KEY } from "@/lib/datastore/constants";
import { legacyVaultId } from "@/lib/datastore/migrate";
import { siblingProvider } from "@/lib/datastore/sync";
import { getProviderFromUri } from "@/lib/datastore/uri";
import type { DatastoreProviderId, DatastoreUri } from "@/lib/datastore/types";

/**
 * One logical vault as this browser knows it: which copies exist, which one
 * is opened by default, and what this device last saw both copies agree on.
 */
export interface VaultRegistryEntry {
  id: string;
  name: string;
  replicas: Partial<Record<DatastoreProviderId, { uri: DatastoreUri }>>;
  primary: DatastoreProviderId;
  lastOpened: string;
  peopleCount: number;
  locationCount: number;
  /** Content hash this device last saw both copies share. */
  agreed?: string;
  /** Set when the last save could not be mirrored to this provider. */
  pendingMirror?: DatastoreProviderId;
}

interface LegacyKnownVault {
  uri: DatastoreUri;
  provider?: DatastoreProviderId;
  name: string;
  lastOpened: string;
  peopleCount: number;
  locationCount: number;
}

function readLegacy(): LegacyKnownVault[] {
  try {
    const raw = localStorage.getItem(KNOWN_VAULTS_LEGACY_KEY);
    return raw ? (JSON.parse(raw) as LegacyKnownVault[]) : [];
  } catch {
    return [];
  }
}

/** Builds registry entries from the pre-registry list; later duplicates (by id) are dropped. */
export function migrateLegacyKnownVaults(legacy: LegacyKnownVault[]): VaultRegistryEntry[] {
  const entries: VaultRegistryEntry[] = [];
  for (const vault of legacy) {
    if (!vault?.uri) continue;
    const provider = vault.provider ?? getProviderFromUri(vault.uri);
    const id = legacyVaultId(vault.uri);
    if (entries.some((entry) => entry.id === id)) continue;
    entries.push({
      id,
      name: vault.name,
      replicas: { [provider]: { uri: vault.uri } },
      primary: provider,
      lastOpened: vault.lastOpened,
      peopleCount: vault.peopleCount,
      locationCount: vault.locationCount,
    });
  }
  return entries;
}

function readAll(): VaultRegistryEntry[] {
  try {
    const raw = localStorage.getItem(VAULT_REGISTRY_KEY);
    if (raw) {
      return JSON.parse(raw) as VaultRegistryEntry[];
    }
  } catch {
    return [];
  }

  // First run after the upgrade: seed from the legacy list. The legacy key is
  // left in place so an older build in another tab keeps working.
  const migrated = migrateLegacyKnownVaults(readLegacy());
  if (migrated.length > 0) {
    writeAll(migrated);
  }
  return migrated;
}

function writeAll(entries: VaultRegistryEntry[]): void {
  try {
    localStorage.setItem(VAULT_REGISTRY_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be unavailable
  }
}

export function getRegistry(): VaultRegistryEntry[] {
  return readAll();
}

export function getRegistryEntry(id: string): VaultRegistryEntry | null {
  return readAll().find((entry) => entry.id === id) ?? null;
}

export function findRegistryEntryByUri(uri: DatastoreUri): VaultRegistryEntry | null {
  return (
    readAll().find((entry) =>
      Object.values(entry.replicas).some((replica) => replica?.uri === uri),
    ) ?? null
  );
}

/** Inserts or replaces an entry (by id) and moves it to the front. */
export function upsertRegistryEntry(entry: VaultRegistryEntry): void {
  const rest = readAll().filter((existing) => existing.id !== entry.id);
  writeAll([entry, ...rest]);
}

export function updateRegistryEntry(
  id: string,
  patch: Partial<Omit<VaultRegistryEntry, "id">>,
): VaultRegistryEntry | null {
  let updated: VaultRegistryEntry | null = null;
  const entries = readAll().map((entry) => {
    if (entry.id !== id) return entry;
    updated = { ...entry, ...patch };
    return updated;
  });
  if (updated) writeAll(entries);
  return updated;
}

export function removeRegistryEntry(id: string): void {
  writeAll(readAll().filter((entry) => entry.id !== id));
}

/** Records that `uri` is a copy of vault `id`; creates the entry if needed. */
export function linkReplica(
  id: string,
  uri: DatastoreUri,
  defaults: Pick<VaultRegistryEntry, "name" | "lastOpened" | "peopleCount" | "locationCount">,
): VaultRegistryEntry {
  const provider = getProviderFromUri(uri);
  const existing = getRegistryEntry(id);
  const entry: VaultRegistryEntry = existing
    ? { ...existing, replicas: { ...existing.replicas, [provider]: { uri } } }
    : { id, ...defaults, replicas: { [provider]: { uri } }, primary: provider };
  upsertRegistryEntry(entry);
  return entry;
}

/**
 * Forgets one copy. When it was the last copy the whole entry goes; when it
 * was the primary, the sibling becomes primary.
 */
export function unlinkReplica(
  id: string,
  provider: DatastoreProviderId,
): VaultRegistryEntry | null {
  const existing = getRegistryEntry(id);
  if (!existing) return null;

  const replicas = { ...existing.replicas };
  delete replicas[provider];

  if (Object.keys(replicas).length === 0) {
    removeRegistryEntry(id);
    return null;
  }

  const primary = existing.primary === provider ? siblingProvider(provider) : existing.primary;
  const next: VaultRegistryEntry = { ...existing, replicas, primary };
  delete next.agreed;
  delete next.pendingMirror;
  upsertRegistryEntry(next);
  return next;
}

/** The URI of the copy that is not `uri`, if the entry has one. */
export function siblingUriOf(entry: VaultRegistryEntry, uri: DatastoreUri): DatastoreUri | null {
  const other = siblingProvider(getProviderFromUri(uri));
  return entry.replicas[other]?.uri ?? null;
}
