import { DATASTORE_FILE_NAME, GITHUB_GISTS_API_URL } from "@/lib/datastore/constants";
import { AuthRequiredError, DatastoreValidationError } from "@/lib/datastore/errors";
import { clearGitHubAuthToken } from "@/lib/datastore/auth";
import {
  createEmptyDocument,
  parseDocumentString,
  serializeDocument,
} from "@/lib/datastore/schema";
import { getGistIdFromUri, normalizeDatastoreUri } from "@/lib/datastore/uri";
import type {
  DatastoreUri,
  MyRegularsDocument,
  StorageAdapter,
  VersionInfo,
} from "@/lib/datastore/types";

interface GistFileResponse {
  content?: string;
}

interface GistHistoryResponse {
  version: string;
  committed_at?: string;
}

interface GistResponse {
  id: string;
  files: Record<string, GistFileResponse | undefined>;
  history?: GistHistoryResponse[];
}

interface GistCommitResponse {
  version: string;
  committed_at: string;
}

interface GistStorageAdapterOptions {
  authToken?: string | null;
  fetchImpl?: typeof fetch;
}

function buildHeaders(authToken?: string | null): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function requireAuthToken(authToken?: string | null): string {
  if (!authToken) {
    throw new AuthRequiredError();
  }

  return authToken;
}

function readManagedFile(response: GistResponse): MyRegularsDocument {
  const file = response.files[DATASTORE_FILE_NAME];

  if (!file?.content) {
    throw new DatastoreValidationError(
      `The gist does not contain the required ${DATASTORE_FILE_NAME} file.`,
    );
  }

  return parseDocumentString(file.content);
}

function getLatestVersion(response: GistResponse): string {
  const version = response.history?.[0]?.version;

  if (!version) {
    throw new DatastoreValidationError("GitHub did not return a gist version.");
  }

  return version;
}

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearGitHubAuthToken();
    throw new AuthRequiredError("GitHub authentication has expired. Please re-authenticate.");
  }

  if (!response.ok) {
    throw new Error(`GitHub Gist request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export class GistStorageAdapter implements StorageAdapter<MyRegularsDocument> {
  private readonly authToken: string | null;
  private readonly fetchImpl: typeof fetch;
  private uri: DatastoreUri | null = null;

  constructor(options: GistStorageAdapterOptions = {}) {
    this.authToken = options.authToken ?? null;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async connect(uri: string): Promise<void> {
    this.uri = normalizeDatastoreUri(uri);
  }

  async create(): Promise<{ uri: DatastoreUri; data: MyRegularsDocument; version: string }> {
    const authToken = requireAuthToken(this.authToken);
    const response = await this.fetchImpl(GITHUB_GISTS_API_URL, {
      method: "POST",
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        public: false,
        files: {
          [DATASTORE_FILE_NAME]: {
            content: serializeDocument(createEmptyDocument()),
          },
        },
      }),
    });
    const gist = await parseJsonResponse<GistResponse>(response);
    this.uri = normalizeDatastoreUri(gist.id);
    return {
      uri: this.getUri(),
      data: readManagedFile(gist),
      version: getLatestVersion(gist),
    };
  }

  async read(): Promise<{ data: MyRegularsDocument; version: string }> {
    const gist = await this.fetchGist();

    return {
      data: readManagedFile(gist),
      version: getLatestVersion(gist),
    };
  }

  async readVersion(version: string): Promise<{ data: MyRegularsDocument; version: string }> {
    const gistId = this.getConnectedGistId();
    const response = await this.fetchImpl(`${GITHUB_GISTS_API_URL}/${gistId}/${version}`, {
      headers: buildHeaders(this.authToken),
    });
    const gist = await parseJsonResponse<GistResponse>(response);

    return {
      data: readManagedFile(gist),
      version,
    };
  }

  async write(data: MyRegularsDocument): Promise<string> {
    const gistId = this.getConnectedGistId();
    const authToken = requireAuthToken(this.authToken);
    const response = await this.fetchImpl(`${GITHUB_GISTS_API_URL}/${gistId}`, {
      method: "PATCH",
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        files: {
          [DATASTORE_FILE_NAME]: {
            content: serializeDocument(data),
          },
        },
      }),
    });
    const gist = await parseJsonResponse<GistResponse>(response);
    return getLatestVersion(gist);
  }

  async listVersions(): Promise<VersionInfo[]> {
    const gistId = this.getConnectedGistId();
    const allVersions: VersionInfo[] = [];
    let url: string | null = `${GITHUB_GISTS_API_URL}/${gistId}/commits?per_page=100`;

    while (url) {
      const response = await this.fetchImpl(url, {
        headers: buildHeaders(this.authToken),
      });
      const versions = await parseJsonResponse<GistCommitResponse[]>(response);

      allVersions.push(
        ...versions.map((version) => ({
          id: version.version,
          createdAt: version.committed_at,
          label: version.version.slice(0, 7),
        })),
      );

      url = parseLinkNext(response.headers.get("link"));
    }

    return allVersions;
  }

  getUri(): DatastoreUri {
    if (!this.uri) {
      throw new DatastoreValidationError("No datastore URI has been connected yet.");
    }

    return this.uri;
  }

  private async fetchGist(): Promise<GistResponse> {
    const gistId = this.getConnectedGistId();
    const response = await this.fetchImpl(`${GITHUB_GISTS_API_URL}/${gistId}`, {
      headers: buildHeaders(this.authToken),
    });
    return parseJsonResponse<GistResponse>(response);
  }

  private getConnectedGistId(): string {
    return getGistIdFromUri(this.getUri());
  }
}
