import type { DatastoreUri } from "@/lib/datastore/types";
import { getProviderFromUri } from "@/lib/datastore/uri";
import type { KnownVault } from "@/lib/vault-types";

const KNOWN_VAULTS_KEY = "myregulars:known-vaults";

function readAll(): KnownVault[] {
  try {
    const raw = localStorage.getItem(KNOWN_VAULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KnownVault[];
    // Backfill provider for legacy entries persisted before it was tracked.
    return parsed.map((vault) => ({
      ...vault,
      provider: vault.provider ?? getProviderFromUri(vault.uri),
    }));
  } catch {
    return [];
  }
}

function writeAll(vaults: KnownVault[]): void {
  try {
    localStorage.setItem(KNOWN_VAULTS_KEY, JSON.stringify(vaults));
  } catch {
    // localStorage may be unavailable
  }
}

export function getKnownVaults(): KnownVault[] {
  return readAll();
}

export function addKnownVault(info: KnownVault): void {
  const vaults = readAll().filter((v) => v.uri !== info.uri);
  vaults.unshift(info);
  writeAll(vaults);
}

export function removeKnownVault(uri: DatastoreUri): void {
  writeAll(readAll().filter((v) => v.uri !== uri));
}

export function updateKnownVault(
  uri: DatastoreUri,
  updates: Partial<Omit<KnownVault, "uri">>,
): void {
  const vaults = readAll().map((v) => (v.uri === uri ? { ...v, ...updates } : v));
  writeAll(vaults);
}
