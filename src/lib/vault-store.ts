"use client";

/**
 * The vault store: module-level state for the currently open vault.
 *
 * It lives outside the React tree on purpose. Routes mount and unmount as the
 * user navigates, but the open vault must not: leaving to the vault list and
 * coming back should be instant, and a debounced save must not be lost
 * because the component that scheduled it went away. Components subscribe
 * through `useVault()` (see vault-context.tsx).
 *
 * Opening is cache-first: the last snapshot this browser saw renders at once,
 * then the remote copy is fetched and swapped in unless the user has already
 * started editing. Unsaved edits are mirrored into an IndexedDB outbox so a
 * tab killed before its save runs can finish on next open.
 */

import type { ToastVariant } from "@/components/ui/toast";
import {
  clearOutbox,
  createDatastore,
  loadDatastore,
  loadDatastoreVersion,
  readCachedDatastore,
  readOutbox,
  rememberVaultOwnership,
  saveDatastore,
  syncDatastoreReplicas,
  writeOutbox,
} from "@/lib/db";
import { DatastoreConflictError } from "@/lib/datastore/errors";
import {
  createGroup,
  createLocation,
  createPerson,
  extractVaultNameFromFileName,
  localDateString,
  toVisitTimestamp,
} from "@/lib/datastore/helpers";
import { getVaultAuthToken, resolveVaultOwnership } from "@/lib/datastore/ownership";
import { findRegistryEntryByUri, siblingUriOf } from "@/lib/datastore/registry";
import { createEmptyDocument } from "@/lib/datastore/schema";
import { siblingProvider, siblingUriFromDocument } from "@/lib/datastore/sync";
import { getIdFromUri, getProviderFromUri, normalizeDatastoreUri } from "@/lib/datastore/uri";
import { addKnownVault, getKnownVaults, updateKnownVault } from "@/lib/known-vaults";
import type {
  DatastoreProviderId,
  DatastoreSnapshot,
  DatastoreUri,
  Location,
  MyRegularsDocument,
  Person,
} from "@/lib/datastore/types";
import type { Vault } from "@/lib/vault-types";

export interface VaultState {
  vault: Vault | null;
  uri: DatastoreUri | null;
  version: string | null;
  isReadOnly: boolean;
  /** True only while there is nothing to show yet. */
  isLoading: boolean;
  /** True while a remote refresh runs behind already-visible content. */
  isRevalidating: boolean;
  isSyncing: boolean;
  /** Where the visible content came from. "cache" means the network hasn't confirmed it. */
  source: "cache" | "remote" | null;
  /** Local edits not yet confirmed saved. */
  dirty: boolean;
  error: string | null;
  ownerHandle: string | null;
  isHistoricalVersion: boolean;
  historicalVersionId: string | null;
  latestVersion: string | null;
}

export interface VaultActions {
  /** Opens a vault cache-first; pass `version` to view a historical snapshot. */
  openVault: (uri: string, options?: { version?: string }) => Promise<void>;
  loadVault: (uri: string) => Promise<void>;
  loadVaultVersion: (uri: string, version: string) => Promise<void>;
  createVault: (name: string, provider?: DatastoreProviderId) => Promise<DatastoreUri>;
  importVault: (
    name: string,
    document: MyRegularsDocument,
    provider?: DatastoreProviderId,
  ) => Promise<DatastoreUri>;
  addLocation: (name: string, description?: string) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  deleteLocation: (locationId: string) => void;
  addGroup: (locationId: string, name: string) => string;
  deleteGroup: (locationId: string, groupId: string) => void;
  updateVaultName: (name: string) => void;
  addPerson: (
    locationId: string,
    groupId: string,
    person: Omit<Person, "id" | "createdAt" | "updatedAt">,
  ) => void;
  updatePerson: (
    locationId: string,
    groupId: string,
    personId: string,
    updates: Partial<Person>,
  ) => void;
  deletePerson: (locationId: string, groupId: string, personId: string) => void;
  movePerson: (
    locationId: string,
    fromGroupId: string,
    toGroupId: string,
    personId: string,
  ) => void;
  /** Logs a visit. `day` is a local `YYYY-MM-DD`; defaults to today. */
  logVisit: (
    locationId: string,
    groupId: string,
    personId: string,
    note?: string,
    day?: string,
  ) => void;
  cloneVault: (name: string) => Promise<DatastoreUri>;
  revertToVersion: () => Promise<void>;
  /** Saves any pending edits now (used when the page is hidden or unloaded). */
  flushPendingSave: () => Promise<void>;
  /** Re-attempts a save after a failure, skipping the debounce. */
  retrySave: () => Promise<void>;
}

export type VaultEvent = { type: "toast"; message: string; variant?: ToastVariant };

const DEBOUNCE_MS = 1500;

const INITIAL_STATE: VaultState = {
  vault: null,
  uri: null,
  version: null,
  isReadOnly: false,
  isLoading: false,
  isRevalidating: false,
  isSyncing: false,
  source: null,
  dirty: false,
  error: null,
  ownerHandle: null,
  isHistoricalVersion: false,
  historicalVersionId: null,
  latestVersion: null,
};

// ─── Module state ────────────────────────────────────────────────────────────

let state: VaultState = INITIAL_STATE;
const listeners = new Set<() => void>();
const eventListeners = new Set<(event: VaultEvent) => void>();

/** The document as last read from or written to the datastore (metadata source). */
let currentDocument: MyRegularsDocument | null = null;
/** Bumped on every local mutation; lets async work tell "edited since I started". */
let mutationSeq = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
/** The in-flight save, so a flush can await it and saves never interleave. */
let inFlightSave: Promise<void> | null = null;
/** Increments on every open so stale async results for a previous vault are ignored. */
let openSeq = 0;

function setState(patch: Partial<VaultState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function emit(event: VaultEvent): void {
  for (const listener of eventListeners) listener(event);
}

function toast(message: string, variant?: ToastVariant): void {
  emit({ type: "toast", message, variant });
}

export function subscribeVaultStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVaultState(): VaultState {
  return state;
}

export function getServerVaultState(): VaultState {
  return INITIAL_STATE;
}

export function subscribeVaultEvents(listener: (event: VaultEvent) => void): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

/** Test-only: drop everything, including pending timers. */
export function resetVaultStore(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  inFlightSave = null;
  currentDocument = null;
  mutationSeq = 0;
  openSeq += 1;
  state = INITIAL_STATE;
  for (const listener of listeners) listener();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countPeople(vault: Vault): number {
  return vault.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length;
}

function vaultFromSnapshot(snapshot: DatastoreSnapshot): Vault {
  const existing = getKnownVaults().find((v) => v.uri === snapshot.uri);
  const nameFromFile = snapshot.vaultFileName
    ? extractVaultNameFromFileName(snapshot.vaultFileName)
    : null;
  return {
    name:
      snapshot.document.name ??
      existing?.name ??
      nameFromFile ??
      `Vault ${getIdFromUri(snapshot.uri).slice(0, 6)}`,
    locations: snapshot.document.data.locations,
  };
}

function recordKnown(snapshot: DatastoreSnapshot, vault: Vault): void {
  addKnownVault({
    id: snapshot.document.id,
    uri: snapshot.uri,
    provider: getProviderFromUri(snapshot.uri),
    name: vault.name,
    lastOpened: new Date().toISOString(),
    peopleCount: countPeople(vault),
    locationCount: vault.locations.length,
    replicas: snapshot.document.replicas,
  });
}

function buildDocument(vault: Vault): MyRegularsDocument {
  return {
    ...(currentDocument ?? createEmptyDocument()),
    name: vault.name,
    data: { locations: vault.locations },
  };
}

function adoptSnapshot(snapshot: DatastoreSnapshot, extra: Partial<VaultState> = {}): Vault {
  const vault = vaultFromSnapshot(snapshot);
  currentDocument = snapshot.document;
  setState({
    vault,
    uri: snapshot.uri,
    version: snapshot.version,
    source: snapshot.source,
    ...extra,
  });
  return vault;
}

// ─── Saving ──────────────────────────────────────────────────────────────────

function persistOutbox(): void {
  const { vault, uri, version } = state;
  if (!vault || !uri || !version) return;
  void writeOutbox({
    uri,
    document: buildDocument(vault),
    expectedVersion: version,
    updatedAt: new Date().toISOString(),
  });
}

async function saveNow(options: { keepalive?: boolean } = {}): Promise<void> {
  const { vault, uri, version } = state;
  const token = uri ? getVaultAuthToken(uri) : null;
  if (!vault || !uri || !version || !token || state.isHistoricalVersion) return;

  const seqAtStart = mutationSeq;
  setState({ isSyncing: true });

  try {
    const result = await saveDatastore({
      uri,
      expectedVersion: version,
      document: buildDocument(vault),
      authToken: token,
      keepalive: options.keepalive,
    });

    if (state.uri !== uri) return;

    currentDocument = result.document;
    const settled = mutationSeq === seqAtStart;
    setState({
      version: result.version,
      source: "remote",
      isSyncing: false,
      error: null,
      dirty: settled ? false : state.dirty,
    });
    if (settled) void clearOutbox(uri);

    if (result.mirror.status === "pending") {
      toast(
        result.mirror.reason === "diverged"
          ? "Your other copy has different changes. Open Storage to resolve."
          : "Saved here, but couldn't update your other copy yet.",
        "info",
      );
    }

    updateKnownVault(uri, {
      lastOpened: new Date().toISOString(),
      peopleCount: countPeople(vault),
      locationCount: vault.locations.length,
    });
  } catch (error) {
    if (state.uri !== uri) return;

    if (error instanceof DatastoreConflictError) {
      // The vault changed elsewhere. Reload the latest copy and tell the user;
      // their unsaved local edits are replaced by the remote state.
      try {
        const snapshot = await loadDatastore(uri);
        if (state.uri !== uri) return;
        currentDocument = snapshot.document;
        setState({
          vault: { name: vault.name, locations: snapshot.document.data.locations },
          version: snapshot.version,
          source: snapshot.source,
          isSyncing: false,
          dirty: false,
        });
        void clearOutbox(uri);
        toast("This vault changed elsewhere. Loaded the latest copy.", "error");
      } catch {
        setState({ isSyncing: false, error: "Sync conflict — reload to get latest." });
        toast("Sync conflict. Reload to get the latest.", "error");
      }
    } else {
      setState({ isSyncing: false, error: "Failed to save changes." });
      toast("Couldn't save changes.", "error");
    }
  }
}

function runSave(options: { keepalive?: boolean } = {}): Promise<void> {
  // Serialize: a save started while one is in flight waits for it, then
  // re-reads state so it carries the newest edits and version.
  const previous = inFlightSave ?? Promise.resolve();
  const next = previous.then(() => saveNow(options));
  inFlightSave = next.finally(() => {
    if (inFlightSave === next) inFlightSave = null;
  });
  return inFlightSave;
}

function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runSave();
  }, DEBOUNCE_MS);
}

function retrySave(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  return runSave();
}

async function flushPendingSave(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    await runSave({ keepalive: true });
    return;
  }
  if (inFlightSave) await inFlightSave;
}

function mutateVault(updater: (vault: Vault) => Vault): void {
  const current = state.vault;
  if (!current || state.isHistoricalVersion) return;
  mutationSeq += 1;
  setState({ vault: updater(current), dirty: true });
  persistOutbox();
  scheduleSync();
}

function mutateLocations(updater: (locations: Location[]) => Location[]): void {
  mutateVault((vault) => ({ ...vault, locations: updater(vault.locations) }));
}

// ─── Opening ─────────────────────────────────────────────────────────────────

/**
 * After opening a vault that has a copy in the other provider, bring the two
 * back in line in the background. The sibling is fast-forwarded remotely; if
 * this copy is the one that is behind, its content is adopted locally and
 * flows through the normal save path, so a user who started editing in the
 * meantime never has a remote write pulled out from under them.
 */
function reconcileReplicas(uri: DatastoreUri, document: MyRegularsDocument, writable: boolean) {
  const entry = findRegistryEntryByUri(uri);
  const siblingUri =
    (entry ? siblingUriOf(entry, uri) : null) ?? siblingUriFromDocument(document, uri);
  if (!siblingUri) return;

  const seqAtStart = mutationSeq;
  const self = getProviderFromUri(uri);

  void syncDatastoreReplicas(uri, { applyTo: [siblingProvider(self)] })
    .then((result) => {
      if (state.uri !== uri) return;
      if (result.status.kind !== "fastForward" || result.status.to !== self) return;
      if (!writable || mutationSeq !== seqAtStart || state.dirty) return;

      const current = state.vault;
      const incoming = result.sibling.document;
      if (!current) return;

      const adopted: Vault = {
        name: incoming.name ?? current.name,
        locations: incoming.data.locations,
      };
      currentDocument = {
        ...(currentDocument ?? incoming),
        name: adopted.name,
        data: { locations: adopted.locations },
      };
      mutationSeq += 1;
      setState({ vault: adopted, dirty: true });
      persistOutbox();
      scheduleSync();
      toast("Updated from your other copy.", "info");
    })
    .catch(() => {
      // Offline, signed out of the other provider, etc. Nothing to do now;
      // the next save retries the mirror.
    });
}

/** Fetches the remote copy and swaps it in unless local edits are pending. */
async function revalidate(uri: DatastoreUri, seq: number): Promise<void> {
  setState({ isRevalidating: true });
  try {
    const snapshot = await loadDatastore(uri);
    if (seq !== openSeq || state.uri !== uri) return;

    const ownership = await resolveVaultOwnership(uri, { ownerId: snapshot.ownerId });
    if (seq !== openSeq || state.uri !== uri) return;
    void rememberVaultOwnership(uri, ownership);

    let vault: Vault;
    if (state.dirty && state.vault) {
      // Keep the user's edits; the save path will reconcile the version.
      vault = state.vault;
      setState({ source: snapshot.source });
    } else {
      vault = adoptSnapshot(snapshot);
    }

    setState({
      isReadOnly: ownership.isReadOnly,
      ownerHandle: ownership.ownerHandle,
      isLoading: false,
      isRevalidating: false,
      error: null,
    });
    recordKnown(snapshot, vault);

    if (snapshot.source === "remote") {
      reconcileReplicas(uri, snapshot.document, !ownership.isReadOnly);
    }
  } catch (error) {
    if (seq !== openSeq || state.uri !== uri) return;
    if (state.vault) {
      // Cached content is on screen; the chip shows it is unconfirmed.
      setState({ isLoading: false, isRevalidating: false });
    } else {
      setState({
        isLoading: false,
        isRevalidating: false,
        error: error instanceof Error ? error.message : "Failed to load vault.",
      });
    }
  }
}

async function openVault(uriInput: string, options: { version?: string } = {}): Promise<void> {
  if (options.version) {
    return loadVaultVersion(uriInput, options.version);
  }

  let uri: DatastoreUri;
  try {
    uri = normalizeDatastoreUri(uriInput);
  } catch (error) {
    setState({
      isLoading: false,
      error: error instanceof Error ? error.message : "Invalid vault.",
    });
    return;
  }

  // Already showing this vault: just confirm it is current.
  if (state.uri === uri && state.vault && !state.isHistoricalVersion && !state.error) {
    await revalidate(uri, openSeq);
    return;
  }

  // Switching vaults: don't leave the previous one's edits behind.
  await flushPendingSave();

  const seq = ++openSeq;
  currentDocument = null;
  mutationSeq += 1;
  setState({
    ...INITIAL_STATE,
    uri,
    isLoading: true,
  });

  const [cached, outbox] = await Promise.all([readCachedDatastore(uri), readOutbox(uri)]);
  if (seq !== openSeq) return;

  if (cached) {
    adoptSnapshot(cached, {
      isLoading: false,
      isReadOnly: cached.ownership?.isReadOnly ?? true,
      ownerHandle: cached.ownership?.ownerHandle ?? null,
    });
  }

  if (outbox) {
    // Edits from a previous session that never finished saving. Restore them
    // on top of whatever we have and let the save path conflict-check them.
    currentDocument = outbox.document;
    const vault: Vault = {
      name: outbox.document.name ?? state.vault?.name ?? "Vault",
      locations: outbox.document.data.locations,
    };
    mutationSeq += 1;
    setState({
      vault,
      version: outbox.expectedVersion,
      source: state.source ?? "cache",
      dirty: true,
      isLoading: false,
      isReadOnly: cached?.ownership?.isReadOnly ?? state.isReadOnly,
    });
    scheduleSync();
  }

  await revalidate(uri, seq);
}

async function loadVault(uriInput: string): Promise<void> {
  return openVault(uriInput);
}

async function loadVaultVersion(uriInput: string, version: string): Promise<void> {
  await flushPendingSave();
  const seq = ++openSeq;
  setState({ ...INITIAL_STATE, isLoading: true });
  try {
    // First load the latest to get current version for potential revert
    const latestSnapshot = await loadDatastore(uriInput);
    const uri = latestSnapshot.uri;

    // Now load the historical version
    const snapshot = await loadDatastoreVersion(uri, version);
    if (seq !== openSeq) return;

    const existingVault = getKnownVaults().find((v) => v.uri === uri);
    const vault: Vault = {
      name:
        snapshot.document.name ?? existingVault?.name ?? `Vault ${getIdFromUri(uri).slice(0, 6)}`,
      locations: snapshot.document.data.locations,
    };

    // Keep the latest copy's metadata so a revert writes a well-formed v2
    // document with the right id and replica links.
    currentDocument = latestSnapshot.document;

    setState({
      vault,
      uri,
      version: latestSnapshot.version,
      source: "remote",
      isReadOnly: true,
      isLoading: false,
      error: null,
      ownerHandle: null,
      isHistoricalVersion: true,
      historicalVersionId: version,
      latestVersion: latestSnapshot.version,
    });
  } catch (error) {
    if (seq !== openSeq) return;
    setState({
      isLoading: false,
      error: error instanceof Error ? error.message : "Failed to load version.",
    });
  }
}

// ─── Creating / importing / cloning ──────────────────────────────────────────

async function createVault(
  name: string,
  provider: DatastoreProviderId = "gist",
): Promise<DatastoreUri> {
  await flushPendingSave();
  const snapshot = await createDatastore(name, undefined, provider);
  openSeq += 1;
  currentDocument = snapshot.document;
  const vault: Vault = { name, locations: [] };
  setState({
    ...INITIAL_STATE,
    vault,
    uri: snapshot.uri,
    version: snapshot.version,
    source: "remote",
  });
  recordKnown(snapshot, vault);
  return snapshot.uri;
}

async function importVault(
  name: string,
  document: MyRegularsDocument,
  provider: DatastoreProviderId = "gist",
): Promise<DatastoreUri> {
  await flushPendingSave();
  // An import is a brand-new vault: fresh id, no replica links or sync state
  // carried over from wherever the JSON came from.
  const seed: MyRegularsDocument = {
    ...createEmptyDocument(),
    name,
    data: document.data,
  };
  const snapshot = await createDatastore(name, seed, provider);
  openSeq += 1;
  currentDocument = snapshot.document;
  const vault: Vault = { name, locations: snapshot.document.data.locations };
  setState({
    ...INITIAL_STATE,
    vault,
    uri: snapshot.uri,
    version: snapshot.version,
    source: "remote",
  });
  recordKnown(snapshot, vault);
  return snapshot.uri;
}

async function cloneVault(name: string): Promise<DatastoreUri> {
  const currentVault = state.vault;
  const sourceUri = state.uri;
  if (!currentVault || !sourceUri) throw new Error("No vault loaded to clone.");

  const provider = getProviderFromUri(sourceUri);
  if (!getVaultAuthToken(sourceUri)) {
    throw new Error("Authentication required to clone vault.");
  }

  await flushPendingSave();

  // Create a new vault in the same provider as the source.
  const snapshot = await createDatastore(name, undefined, provider);
  const newUri = snapshot.uri;

  // Save the current vault's data into the new vault. A clone is its own
  // vault (new id, no replica links), so spread the freshly created document.
  const document: MyRegularsDocument = {
    ...snapshot.document,
    name,
    data: { locations: currentVault.locations },
  };

  const saved = await saveDatastore({
    uri: newUri,
    expectedVersion: snapshot.version,
    document,
    authToken: getVaultAuthToken(newUri) ?? undefined,
  });

  openSeq += 1;
  currentDocument = saved.document;
  const newVault: Vault = { name, locations: currentVault.locations };
  setState({
    ...INITIAL_STATE,
    vault: newVault,
    uri: newUri,
    version: saved.version,
    source: "remote",
  });
  recordKnown(saved, newVault);
  return newUri;
}

async function revertToVersion(): Promise<void> {
  const currentVault = state.vault;
  const uri = state.uri;
  const latestVersion = state.version;
  const token = uri ? getVaultAuthToken(uri) : null;

  if (!currentVault || !uri || !latestVersion || !token) {
    throw new Error("Cannot revert: missing vault data or authentication.");
  }

  const saved = await saveDatastore({
    uri,
    expectedVersion: latestVersion,
    document: buildDocument(currentVault),
    authToken: token,
  });

  currentDocument = saved.document;
  setState({
    version: saved.version,
    source: "remote",
    isReadOnly: false,
    isHistoricalVersion: false,
    historicalVersionId: null,
    latestVersion: null,
    isSyncing: false,
    dirty: false,
  });
}

// ─── Mutators ────────────────────────────────────────────────────────────────

function addLocation(name: string, description?: string): void {
  mutateLocations((locs) => [...locs, createLocation(name, description)]);
}

function updateLocation(locationId: string, updates: Partial<Location>): void {
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l,
    ),
  );
}

function deleteLocation(locationId: string): void {
  mutateLocations((locs) => locs.filter((l) => l.id !== locationId));
}

function addGroup(locationId: string, name: string): string {
  const normalizedName = name.trim().toLowerCase();
  const location = state.vault?.locations.find((l) => l.id === locationId);
  const existing = location?.groups.find((g) => g.name.toLowerCase() === normalizedName);
  if (existing) {
    return existing.id;
  }
  const newGroup = createGroup(name);
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId
        ? { ...l, groups: [...l.groups, newGroup], updatedAt: new Date().toISOString() }
        : l,
    ),
  );
  return newGroup.id;
}

function deleteGroup(locationId: string, groupId: string): void {
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId
        ? {
            ...l,
            groups: l.groups.filter((g) => g.id !== groupId),
            updatedAt: new Date().toISOString(),
          }
        : l,
    ),
  );
}

function updateVaultName(name: string): void {
  const uri = state.uri;
  if (!uri) return;
  mutateVault((vault) => ({ ...vault, name }));
  updateKnownVault(uri, { name });
}

function addPerson(
  locationId: string,
  groupId: string,
  person: Omit<Person, "id" | "createdAt" | "updatedAt">,
): void {
  const newPerson = createPerson(person.name, person.detail);
  const fullPerson: Person = { ...newPerson, ...person };
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId
        ? {
            ...l,
            groups: l.groups.map((g) =>
              g.id === groupId
                ? { ...g, people: [...g.people, fullPerson], updatedAt: new Date().toISOString() }
                : g,
            ),
            updatedAt: new Date().toISOString(),
          }
        : l,
    ),
  );
}

function updatePerson(
  locationId: string,
  groupId: string,
  personId: string,
  updates: Partial<Person>,
): void {
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId
        ? {
            ...l,
            groups: l.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    people: g.people.map((p) =>
                      p.id === personId
                        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                        : p,
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : g,
            ),
            updatedAt: new Date().toISOString(),
          }
        : l,
    ),
  );
}

function deletePerson(locationId: string, groupId: string, personId: string): void {
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId
        ? {
            ...l,
            groups: l.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    people: g.people.filter((p) => p.id !== personId),
                    updatedAt: new Date().toISOString(),
                  }
                : g,
            ),
            updatedAt: new Date().toISOString(),
          }
        : l,
    ),
  );
}

function movePerson(
  locationId: string,
  fromGroupId: string,
  toGroupId: string,
  personId: string,
): void {
  mutateLocations((locs) =>
    locs.map((l) => {
      if (l.id !== locationId) return l;
      const person = l.groups
        .find((g) => g.id === fromGroupId)
        ?.people.find((p) => p.id === personId);
      if (!person) return l;
      return {
        ...l,
        groups: l.groups.map((g) => {
          if (g.id === fromGroupId) {
            return {
              ...g,
              people: g.people.filter((p) => p.id !== personId),
              updatedAt: new Date().toISOString(),
            };
          }
          if (g.id === toGroupId) {
            return {
              ...g,
              people: [...g.people, { ...person, updatedAt: new Date().toISOString() }],
              updatedAt: new Date().toISOString(),
            };
          }
          return g;
        }),
        updatedAt: new Date().toISOString(),
      };
    }),
  );
}

function logVisit(
  locationId: string,
  groupId: string,
  personId: string,
  note?: string,
  day?: string,
): void {
  const visitDate = toVisitTimestamp(day ?? localDateString());
  mutateLocations((locs) =>
    locs.map((l) =>
      l.id === locationId
        ? {
            ...l,
            groups: l.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    people: g.people.map((p) => {
                      if (p.id !== personId) return p;
                      const entry = { date: visitDate, ...(note ? { note } : {}) };
                      // Keep the log newest-first even when back-filling an
                      // older visit, and never let lastSeen move backwards.
                      const visitLog = [entry, ...(p.visitLog ?? [])].sort((a, b) =>
                        b.date.localeCompare(a.date),
                      );
                      const lastSeen =
                        p.lastSeen && p.lastSeen > visitDate ? p.lastSeen : visitDate;
                      return { ...p, lastSeen, visitLog, updatedAt: new Date().toISOString() };
                    }),
                    updatedAt: new Date().toISOString(),
                  }
                : g,
            ),
            updatedAt: new Date().toISOString(),
          }
        : l,
    ),
  );
}

export const vaultActions: VaultActions = {
  openVault,
  loadVault,
  loadVaultVersion,
  createVault,
  importVault,
  addLocation,
  updateLocation,
  deleteLocation,
  addGroup,
  deleteGroup,
  updateVaultName,
  addPerson,
  updatePerson,
  deletePerson,
  movePerson,
  logVisit,
  cloneVault,
  revertToVersion,
  flushPendingSave,
  retrySave,
};
