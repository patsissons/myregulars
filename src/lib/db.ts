import { GistStorageAdapter } from "@/lib/datastore/gist-adapter";
import { PocketBaseStorageAdapter } from "@/lib/datastore/pocketbase-adapter";
import { beginGitHubAuth as startGitHubAuth, getGitHubAuthToken } from "@/lib/datastore/auth";
import { createDatastoreCache, type OutboxEntry } from "@/lib/datastore/cache";
import { contentHash } from "@/lib/datastore/content-hash";
import {
  AuthRequiredError,
  DatastoreConflictError,
  DatastoreNotInSyncError,
  DatastoreValidationError,
} from "@/lib/datastore/errors";
import { buildVaultFileName } from "@/lib/datastore/helpers";
import { getHostedAuthToken } from "@/lib/datastore/pocketbase-auth";
import { isHostedConfigured } from "@/lib/datastore/pocketbase-config";
import {
  findRegistryEntryByUri,
  getRegistryEntry,
  linkReplica,
  unlinkReplica,
  updateRegistryEntry,
  type VaultRegistryEntry,
} from "@/lib/datastore/registry";
import { createEmptyDocument, withUpdatedTimestamp } from "@/lib/datastore/schema";
import {
  adoptContent,
  computeSyncStatus,
  replicaStateOf,
  siblingProvider,
  siblingUriFromDocument,
  withReplicaLink,
  withSyncBase,
  withoutReplicaLink,
  type SyncStatus,
} from "@/lib/datastore/sync";
import {
  getIdFromUri,
  getProviderFromUri,
  normalizeDatastoreUri,
  resolveDatastoreConnection,
} from "@/lib/datastore/uri";
import type {
  DatastoreConnection,
  DatastoreProviderId,
  DatastoreSnapshot,
  DatastoreUri,
  DiscoveredVault,
  MyRegularsDocument,
  StorageAdapter,
  VersionInfo,
} from "@/lib/datastore/types";

const datastoreCache = createDatastoreCache();

function createGistAdapter(authToken?: string | null, fileName?: string): GistStorageAdapter {
  return new GistStorageAdapter({ authToken: authToken ?? getGitHubAuthToken(), fileName });
}

/**
 * Builds the adapter for an existing vault, routed by the URI scheme. Hosted
 * adapters source credentials from the shared PocketBase client; gist adapters
 * use the supplied (or stored) GitHub token.
 */
function createAdapterForUri(
  uri: DatastoreUri,
  authToken?: string | null,
): StorageAdapter<MyRegularsDocument> {
  if (getProviderFromUri(uri) === "hosted") {
    return new PocketBaseStorageAdapter();
  }

  return createGistAdapter(authToken);
}

function createAdapterForProvider(
  provider: DatastoreProviderId,
  vaultName?: string,
): StorageAdapter<MyRegularsDocument> {
  if (provider === "hosted") {
    return new PocketBaseStorageAdapter();
  }

  return createGistAdapter(
    getGitHubAuthToken(),
    vaultName ? buildVaultFileName(vaultName) : undefined,
  );
}

function buildHostedSeed(
  vaultName?: string,
  initialDocument?: MyRegularsDocument,
): MyRegularsDocument | undefined {
  if (initialDocument) {
    return vaultName ? { ...initialDocument, name: vaultName } : initialDocument;
  }

  if (vaultName) {
    return createEmptyDocument(new Date(), { name: vaultName });
  }

  return undefined;
}

function snapshotFromAdapter(
  adapter: StorageAdapter<MyRegularsDocument>,
  uri: DatastoreUri,
  document: MyRegularsDocument,
  version: string,
): DatastoreSnapshot {
  return {
    document,
    version,
    uri,
    source: "remote",
    vaultFileName: adapter.getVaultFileName?.() ?? undefined,
    ownerId: adapter.getOwnerId?.() ?? undefined,
    isPublic: adapter.isPublic?.() ?? undefined,
  };
}

async function cacheSnapshot(snapshot: DatastoreSnapshot): Promise<DatastoreSnapshot> {
  // Ownership is resolved separately from the read; keep what we knew.
  const previous = snapshot.ownership ? null : await datastoreCache.get(snapshot.uri);
  const merged = previous?.ownership ? { ...snapshot, ownership: previous.ownership } : snapshot;
  await datastoreCache.set(merged);
  datastoreCache.setPreferredUri(merged.uri);
  return merged;
}

/** Records the current user's access to a vault alongside its cached copy. */
export async function rememberVaultOwnership(
  uri: string,
  ownership: NonNullable<DatastoreSnapshot["ownership"]>,
): Promise<void> {
  const connection = resolveConnection(uri);
  const cached = await datastoreCache.get(connection.uri);
  if (cached) {
    await datastoreCache.set({ ...cached, ownership });
  }
}

/** Unsaved edits persisted for a vault, if any. */
export async function readOutbox(uri: string): Promise<OutboxEntry | null> {
  return datastoreCache.getOutbox(resolveConnection(uri).uri);
}

export async function writeOutbox(entry: OutboxEntry): Promise<void> {
  await datastoreCache.setOutbox(entry);
}

export async function clearOutbox(uri: string): Promise<void> {
  await datastoreCache.clearOutbox(resolveConnection(uri).uri);
}

function resolveConnection(uri: string): DatastoreConnection {
  return resolveDatastoreConnection(uri);
}

async function readReplica(uri: DatastoreUri): Promise<{
  adapter: StorageAdapter<MyRegularsDocument>;
  document: MyRegularsDocument;
  version: string;
}> {
  const adapter = createAdapterForUri(uri);
  await adapter.connect(uri);
  const latest = await adapter.read();
  return { adapter, document: latest.data, version: latest.version };
}

export async function beginGitHubAuthFlow(): Promise<string> {
  return startGitHubAuth();
}

export const beginGitHubAuth = beginGitHubAuthFlow;

export async function createDatastore(
  vaultName?: string,
  initialDocument?: MyRegularsDocument,
  provider: DatastoreProviderId = "gist",
): Promise<DatastoreSnapshot> {
  if (provider === "hosted") {
    const adapter = new PocketBaseStorageAdapter();
    const created = await adapter.create(buildHostedSeed(vaultName, initialDocument));

    return cacheSnapshot(snapshotFromAdapter(adapter, created.uri, created.data, created.version));
  }

  const fileName = vaultName ? buildVaultFileName(vaultName) : undefined;
  const adapter = createGistAdapter(getGitHubAuthToken(), fileName);
  // The name lives in the document too (not just the file name) so copies
  // and the hosted provider see the same thing.
  const seed =
    initialDocument ??
    (vaultName ? createEmptyDocument(new Date(), { name: vaultName }) : undefined);
  const created = await adapter.create(seed);

  return cacheSnapshot(snapshotFromAdapter(adapter, created.uri, created.data, created.version));
}

export async function connectDatastore(uri: string): Promise<DatastoreConnection> {
  const connection = resolveConnection(uri);
  datastoreCache.setPreferredUri(connection.uri);
  return connection;
}

/** The locally cached copy of a vault, if any. Never touches the network. */
export async function readCachedDatastore(uri: string): Promise<DatastoreSnapshot | null> {
  const connection = resolveConnection(uri);
  const cached = await datastoreCache.get(connection.uri);
  return cached ? { ...cached, source: "cache" } : null;
}

export async function loadDatastore(uri: string): Promise<DatastoreSnapshot> {
  const connection = resolveConnection(uri);
  const adapter = createAdapterForUri(connection.uri);
  await adapter.connect(connection.uri);

  try {
    const latest = await adapter.read();

    return cacheSnapshot(snapshotFromAdapter(adapter, connection.uri, latest.data, latest.version));
  } catch (error) {
    const cached = await datastoreCache.get(connection.uri);

    if (cached) {
      datastoreCache.setPreferredUri(connection.uri);
      return {
        ...cached,
        source: "cache",
      };
    }

    throw error;
  }
}

export async function loadDatastoreVersion(
  uri: string,
  version: string,
): Promise<DatastoreSnapshot> {
  const connection = resolveConnection(uri);
  const adapter = createAdapterForUri(connection.uri);
  await adapter.connect(connection.uri);
  const snapshot = await adapter.readVersion(version);

  return {
    document: snapshot.data,
    version: snapshot.version,
    uri: connection.uri,
    source: "remote",
  };
}

export type MirrorOutcome =
  | { status: "none" }
  | { status: "mirrored"; provider: DatastoreProviderId; hash: string }
  | { status: "pending"; provider: DatastoreProviderId; reason: "diverged" | "auth" | "error" };

export interface SaveResult extends DatastoreSnapshot {
  mirror: MirrorOutcome;
}

/**
 * Pushes freshly saved content onto the sibling copy when that is safe.
 * Never throws: a failed mirror is recorded on the registry entry as
 * `pendingMirror` and retried on the next save or open.
 */
async function mirrorTo(
  entry: VaultRegistryEntry,
  primaryUri: DatastoreUri,
  siblingUri: DatastoreUri,
  primaryDocument: MyRegularsDocument,
): Promise<MirrorOutcome> {
  const primaryProvider = getProviderFromUri(primaryUri);
  const target = getProviderFromUri(siblingUri);
  const nextHash = contentHash(primaryDocument);

  try {
    const sibling = await readReplica(siblingUri);
    const status = computeSyncStatus(
      replicaStateOf(primaryProvider, primaryDocument),
      replicaStateOf(target, sibling.document),
      entry.agreed,
    );

    if (status.kind === "inSync") {
      updateRegistryEntry(entry.id, { agreed: nextHash, pendingMirror: undefined });
      return { status: "mirrored", provider: target, hash: nextHash };
    }

    if (status.kind === "fastForward" && status.to === target) {
      const mirrored = withUpdatedTimestamp(
        withSyncBase(
          withReplicaLink(
            adoptContent(sibling.document, primaryDocument),
            primaryProvider,
            getIdFromUri(primaryUri),
          ),
          nextHash,
        ),
      );
      const version = await sibling.adapter.write(mirrored, { expectedVersion: sibling.version });
      await datastoreCache.set(snapshotFromAdapter(sibling.adapter, siblingUri, mirrored, version));
      updateRegistryEntry(entry.id, { agreed: nextHash, pendingMirror: undefined });
      return { status: "mirrored", provider: target, hash: nextHash };
    }

    updateRegistryEntry(entry.id, { pendingMirror: target });
    return { status: "pending", provider: target, reason: "diverged" };
  } catch (error) {
    updateRegistryEntry(entry.id, { pendingMirror: target });
    return {
      status: "pending",
      provider: target,
      reason: error instanceof AuthRequiredError ? "auth" : "error",
    };
  }
}

/** The registry entry for a vault, found by its URI or by the document's id. */
function findEntry(uri: DatastoreUri, document?: MyRegularsDocument): VaultRegistryEntry | null {
  return findRegistryEntryByUri(uri) ?? (document ? getRegistryEntry(document.id) : null);
}

function siblingUriFor(
  uri: DatastoreUri,
  document: MyRegularsDocument,
  entry: VaultRegistryEntry | null,
): DatastoreUri | null {
  const other = siblingProvider(getProviderFromUri(uri));
  return entry?.replicas[other]?.uri ?? siblingUriFromDocument(document, uri);
}

export async function saveDatastore(input: {
  uri: string;
  expectedVersion: string;
  document: MyRegularsDocument;
  authToken?: string;
  /** Mirror onto the sibling copy when the vault has one. Defaults to true. */
  mirror?: boolean;
  keepalive?: boolean;
}): Promise<SaveResult> {
  const connection = resolveConnection(input.uri);
  const adapter = createAdapterForUri(connection.uri, input.authToken);
  await adapter.connect(connection.uri);

  const current = await adapter.read();

  if (current.version !== input.expectedVersion) {
    throw new DatastoreConflictError();
  }

  const entry = findEntry(connection.uri, input.document);
  const siblingUri = siblingUriFor(connection.uri, input.document, entry);

  // While linked, the primary's base is what both copies last agreed on, so a
  // later comparison can tell whether the sibling moved in the meantime.
  let document = input.document;
  if (siblingUri && entry?.agreed) {
    document = withSyncBase(document, entry.agreed);
  }
  document = withUpdatedTimestamp(document);

  const version = await adapter.write(document, {
    expectedVersion: input.expectedVersion,
    keepalive: input.keepalive,
  });

  const snapshot = await cacheSnapshot(
    snapshotFromAdapter(adapter, connection.uri, document, version),
  );

  let mirror: MirrorOutcome = { status: "none" };
  if (siblingUri && input.mirror !== false) {
    const linked =
      entry ??
      linkReplica(document.id, connection.uri, {
        name: document.name ?? "",
        lastOpened: new Date().toISOString(),
        peopleCount: 0,
        locationCount: 0,
      });
    mirror = await mirrorTo(linked, connection.uri, siblingUri, document);
  }

  return { ...snapshot, mirror };
}

export interface CopyResult {
  source: DatastoreSnapshot;
  target: DatastoreSnapshot;
  hash: string;
}

/**
 * Creates a copy of a vault in the other provider and links the two copies
 * to each other so future saves mirror between them.
 */
export async function copyDatastore(
  sourceUri: string,
  targetProvider: DatastoreProviderId,
): Promise<CopyResult> {
  const uri = normalizeDatastoreUri(sourceUri);
  const sourceProvider = getProviderFromUri(uri);

  if (sourceProvider === targetProvider) {
    throw new DatastoreValidationError("A vault cannot be copied onto its own provider.");
  }

  const source = await readReplica(uri);

  if (source.document.replicas?.[targetProvider]) {
    throw new DatastoreValidationError("This vault already has a copy in that provider.");
  }

  const hash = contentHash(source.document);
  const now = new Date();
  const targetSeed = withUpdatedTimestamp(
    withSyncBase(
      withReplicaLink(
        { ...source.document, replicas: undefined, sync: undefined },
        sourceProvider,
        getIdFromUri(uri),
      ),
      hash,
      now,
    ),
    now,
  );

  const targetAdapter = createAdapterForProvider(targetProvider, source.document.name);
  const created = await targetAdapter.create(targetSeed);
  const targetSnapshot = await cacheSnapshot(
    snapshotFromAdapter(targetAdapter, created.uri, created.data, created.version),
  );

  const linkedSource = withUpdatedTimestamp(
    withSyncBase(
      withReplicaLink(source.document, targetProvider, getIdFromUri(created.uri)),
      hash,
      now,
    ),
    now,
  );
  const sourceVersion = await source.adapter.write(linkedSource, {
    expectedVersion: source.version,
  });
  const sourceSnapshot = await cacheSnapshot(
    snapshotFromAdapter(source.adapter, uri, linkedSource, sourceVersion),
  );

  const peopleCount = linkedSource.data.locations.flatMap((l) =>
    l.groups.flatMap((g) => g.people),
  ).length;
  const defaults = {
    name: linkedSource.name ?? "",
    lastOpened: now.toISOString(),
    peopleCount,
    locationCount: linkedSource.data.locations.length,
  };
  linkReplica(linkedSource.id, uri, defaults);
  linkReplica(linkedSource.id, created.uri, defaults);
  updateRegistryEntry(linkedSource.id, { agreed: hash, pendingMirror: undefined });

  return { source: sourceSnapshot, target: targetSnapshot, hash };
}

export interface ReplicaSyncResult {
  status: SyncStatus;
  /** True when a fast-forward was written. */
  applied: boolean;
  primary: DatastoreSnapshot;
  sibling: DatastoreSnapshot;
}

/**
 * Compares the two copies of a vault and fast-forwards whichever side is
 * behind, provided that side is in `applyTo` (default: either). Diverged
 * copies are reported, not resolved. Throws when the vault has no sibling.
 */
export async function syncDatastoreReplicas(
  vaultUri: string,
  options: { applyTo?: DatastoreProviderId[] } = {},
): Promise<ReplicaSyncResult> {
  const uri = normalizeDatastoreUri(vaultUri);
  const primary = await readReplica(uri);
  const entry = findEntry(uri, primary.document);
  const siblingUri = siblingUriFor(uri, primary.document, entry);

  if (!siblingUri) {
    throw new DatastoreValidationError("This vault has no other copy to sync with.");
  }

  const sibling = await readReplica(siblingUri);
  const primaryProvider = getProviderFromUri(uri);
  const siblingProv = getProviderFromUri(siblingUri);
  const status = computeSyncStatus(
    replicaStateOf(primaryProvider, primary.document),
    replicaStateOf(siblingProv, sibling.document),
    entry?.agreed,
  );

  let primarySnapshot = snapshotFromAdapter(
    primary.adapter,
    uri,
    primary.document,
    primary.version,
  );
  let siblingSnapshot = snapshotFromAdapter(
    sibling.adapter,
    siblingUri,
    sibling.document,
    sibling.version,
  );
  let applied = false;

  const applyTo = options.applyTo ?? ["gist", "hosted"];
  if (status.kind === "fastForward" && applyTo.includes(status.to)) {
    const behind = status.to === primaryProvider ? primary : sibling;
    const ahead = status.to === primaryProvider ? sibling : primary;
    const behindUri = status.to === primaryProvider ? uri : siblingUri;
    const aheadUri = status.to === primaryProvider ? siblingUri : uri;

    const updated = withUpdatedTimestamp(
      withSyncBase(
        withReplicaLink(
          adoptContent(behind.document, ahead.document),
          getProviderFromUri(aheadUri),
          getIdFromUri(aheadUri),
        ),
        status.hash,
      ),
    );
    const version = await behind.adapter.write(updated, { expectedVersion: behind.version });
    const updatedSnapshot = await cacheSnapshot(
      snapshotFromAdapter(behind.adapter, behindUri, updated, version),
    );
    if (status.to === primaryProvider) {
      primarySnapshot = updatedSnapshot;
    } else {
      siblingSnapshot = updatedSnapshot;
    }
    applied = true;
  }

  const agreedHash =
    status.kind === "inSync" || (status.kind === "fastForward" && applied) ? status.hash : null;
  if (entry && agreedHash) {
    updateRegistryEntry(entry.id, { agreed: agreedHash, pendingMirror: undefined });
  }

  await datastoreCache.set(primarySnapshot);
  await datastoreCache.set(siblingSnapshot);
  datastoreCache.setPreferredUri(uri);

  return { status, applied, primary: primarySnapshot, sibling: siblingSnapshot };
}

/**
 * Permanently deletes one copy of a vault. When the vault has another copy,
 * the two must be in sync (unless `force`), and the surviving copy is
 * unlinked so it stops trying to mirror.
 */
export async function deleteDatastore(
  vaultUri: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const uri = normalizeDatastoreUri(vaultUri);
  const provider = getProviderFromUri(uri);
  const doomed = await readReplica(uri);
  const entry = findEntry(uri, doomed.document);
  const siblingUri = siblingUriFor(uri, doomed.document, entry);

  let sibling: Awaited<ReturnType<typeof readReplica>> | null = null;
  if (siblingUri) {
    sibling = await readReplica(siblingUri);
    if (!options.force) {
      const status = computeSyncStatus(
        replicaStateOf(provider, doomed.document),
        replicaStateOf(getProviderFromUri(siblingUri), sibling.document),
        entry?.agreed,
      );
      if (status.kind !== "inSync") {
        throw new DatastoreNotInSyncError();
      }
    }
  }

  await doomed.adapter.delete();
  await datastoreCache.remove(uri);

  if (sibling && siblingUri) {
    const unlinked = withUpdatedTimestamp(withoutReplicaLink(sibling.document, provider));
    const version = await sibling.adapter.write(unlinked, { expectedVersion: sibling.version });
    await cacheSnapshot(snapshotFromAdapter(sibling.adapter, siblingUri, unlinked, version));
  }

  if (entry) {
    unlinkReplica(entry.id, provider);
  }
}

/** Hosted only: toggles whether anyone with the link may read the vault. */
export async function setDatastorePublic(
  vaultUri: string,
  isPublic: boolean,
): Promise<{ version: string }> {
  const uri = normalizeDatastoreUri(vaultUri);
  const adapter = createAdapterForUri(uri);
  await adapter.connect(uri);

  if (!adapter.setPublic) {
    throw new DatastoreValidationError("This provider's vaults are always link-readable.");
  }

  const version = await adapter.setPublic(isPublic);
  const cached = await datastoreCache.get(uri);
  if (cached) {
    await datastoreCache.set({ ...cached, version, isPublic });
  }
  return { version };
}

export async function listDatastoreVersions(uri: string): Promise<VersionInfo[]> {
  const connection = resolveConnection(uri);
  const adapter = createAdapterForUri(connection.uri);
  await adapter.connect(connection.uri);
  datastoreCache.setPreferredUri(connection.uri);
  return adapter.listVersions();
}

async function discoverGistVaults(): Promise<DiscoveredVault[]> {
  const authToken = getGitHubAuthToken();

  if (!authToken) {
    return [];
  }

  try {
    return await new GistStorageAdapter({ authToken }).discover();
  } catch {
    return [];
  }
}

async function discoverHostedVaults(): Promise<DiscoveredVault[]> {
  if (!isHostedConfigured() || !getHostedAuthToken()) {
    return [];
  }

  try {
    return await new PocketBaseStorageAdapter().discover();
  } catch {
    return [];
  }
}

export async function discoverDatastores(): Promise<DiscoveredVault[]> {
  const [gist, hosted] = await Promise.all([discoverGistVaults(), discoverHostedVaults()]);
  return [...gist, ...hosted];
}

export function getPreferredDatastoreUri(): DatastoreUri | null {
  return datastoreCache.getPreferredUri();
}

export type { OutboxEntry };
