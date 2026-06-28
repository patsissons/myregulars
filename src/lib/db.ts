import { GistStorageAdapter } from "@/lib/datastore/gist-adapter";
import { PocketBaseStorageAdapter } from "@/lib/datastore/pocketbase-adapter";
import { beginGitHubAuth as startGitHubAuth, getGitHubAuthToken } from "@/lib/datastore/auth";
import { createDatastoreCache } from "@/lib/datastore/cache";
import { DatastoreConflictError } from "@/lib/datastore/errors";
import { buildVaultFileName } from "@/lib/datastore/helpers";
import { getHostedAuthToken } from "@/lib/datastore/pocketbase-auth";
import { isHostedConfigured } from "@/lib/datastore/pocketbase-config";
import { createEmptyDocument, withUpdatedTimestamp } from "@/lib/datastore/schema";
import { getProviderFromUri, resolveDatastoreConnection } from "@/lib/datastore/uri";
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

function buildHostedSeed(
  vaultName?: string,
  initialDocument?: MyRegularsDocument,
): MyRegularsDocument | undefined {
  if (initialDocument) {
    return vaultName ? { ...initialDocument, name: vaultName } : initialDocument;
  }

  if (vaultName) {
    return { ...createEmptyDocument(), name: vaultName };
  }

  return undefined;
}

async function cacheSnapshot(snapshot: DatastoreSnapshot): Promise<DatastoreSnapshot> {
  await datastoreCache.set(snapshot);
  datastoreCache.setPreferredUri(snapshot.uri);
  return snapshot;
}

function resolveConnection(uri: string): DatastoreConnection {
  return resolveDatastoreConnection(uri);
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

    return cacheSnapshot({
      document: created.data,
      version: created.version,
      uri: created.uri,
      source: "remote",
    });
  }

  const fileName = vaultName ? buildVaultFileName(vaultName) : undefined;
  const adapter = createGistAdapter(getGitHubAuthToken(), fileName);
  const created = await adapter.create(initialDocument);

  return cacheSnapshot({
    document: created.data,
    version: created.version,
    uri: created.uri,
    source: "remote",
  });
}

export async function connectDatastore(uri: string): Promise<DatastoreConnection> {
  const connection = resolveConnection(uri);
  datastoreCache.setPreferredUri(connection.uri);
  return connection;
}

export async function loadDatastore(uri: string): Promise<DatastoreSnapshot> {
  const connection = resolveConnection(uri);
  const adapter = createAdapterForUri(connection.uri);
  await adapter.connect(connection.uri);

  try {
    const latest = await adapter.read();

    return cacheSnapshot({
      document: latest.data,
      version: latest.version,
      uri: connection.uri,
      source: "remote",
      vaultFileName: adapter.getVaultFileName?.() ?? undefined,
    });
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

export async function saveDatastore(input: {
  uri: string;
  expectedVersion: string;
  document: MyRegularsDocument;
  authToken?: string;
}): Promise<DatastoreSnapshot> {
  const connection = resolveConnection(input.uri);
  const adapter = createAdapterForUri(connection.uri, input.authToken);
  await adapter.connect(connection.uri);

  const current = await adapter.read();

  if (current.version !== input.expectedVersion) {
    throw new DatastoreConflictError();
  }

  const document = withUpdatedTimestamp(input.document);
  const version = await adapter.write(document);

  return cacheSnapshot({
    document,
    version,
    uri: connection.uri,
    source: "remote",
  });
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
