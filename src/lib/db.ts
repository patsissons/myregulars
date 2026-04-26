import { GistStorageAdapter } from "@/lib/datastore/gist-adapter";
import { beginGitHubAuth as startGitHubAuth, getGitHubAuthToken } from "@/lib/datastore/auth";
import { createDatastoreCache } from "@/lib/datastore/cache";
import { DatastoreConflictError } from "@/lib/datastore/errors";
import { buildVaultFileName } from "@/lib/datastore/helpers";
import { withUpdatedTimestamp } from "@/lib/datastore/schema";
import { resolveDatastoreConnection } from "@/lib/datastore/uri";
import type {
  DatastoreConnection,
  DatastoreSnapshot,
  DatastoreUri,
  MyRegularsDocument,
  VersionInfo,
} from "@/lib/datastore/types";

const datastoreCache = createDatastoreCache();

function createAdapter(authToken?: string | null, fileName?: string): GistStorageAdapter {
  return new GistStorageAdapter({ authToken, fileName });
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

export async function createDatastore(vaultName?: string): Promise<DatastoreSnapshot> {
  const authToken = getGitHubAuthToken();
  const fileName = vaultName ? buildVaultFileName(vaultName) : undefined;
  const adapter = createAdapter(authToken, fileName);
  const created = await adapter.create();

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
  const adapter = createAdapter();
  await adapter.connect(connection.uri);

  try {
    const latest = await adapter.read();

    return cacheSnapshot({
      document: latest.data,
      version: latest.version,
      uri: connection.uri,
      source: "remote",
      vaultFileName: adapter.getVaultFileName() ?? undefined,
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
  const adapter = createAdapter();
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
  authToken: string;
}): Promise<DatastoreSnapshot> {
  const connection = resolveConnection(input.uri);
  const adapter = createAdapter(input.authToken);
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
  const adapter = createAdapter();
  await adapter.connect(connection.uri);
  datastoreCache.setPreferredUri(connection.uri);
  return adapter.listVersions();
}

export function getPreferredDatastoreUri(): DatastoreUri | null {
  return datastoreCache.getPreferredUri();
}
