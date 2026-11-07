export const DATASTORE_FILE_NAME = "myregulars.json";

/**
 * Default timeout for datastore/auth network requests. Idle mobile tabs resume
 * with half-open sockets; without a timeout those requests hang forever.
 */
export const REQUEST_TIMEOUT_MS = 15_000;
export const DATASTORE_FILE_PATTERN = /^myregulars\.[^.]+\.json$/;
export const DATASTORE_APP_NAME = "myregulars";
/** The schema every write emits. Reads also accept DATASTORE_LEGACY_SCHEMA_VERSION. */
export const DATASTORE_SCHEMA_VERSION = 2;
export const DATASTORE_LEGACY_SCHEMA_VERSION = 1;

export const DATASTORE_PREFERENCE_KEY = "myregulars:datastore-uri";
/** Pre-registry known-vaults list (one entry per provider URI). Read once, then migrated. */
export const KNOWN_VAULTS_LEGACY_KEY = "myregulars:known-vaults";
/** Vault registry: one entry per logical vault, with its replicas and sync state. */
export const VAULT_REGISTRY_KEY = "myregulars:known-vaults@2";
export const GITHUB_AUTH_TOKEN_KEY = "myregulars:github-auth-token";

export const DATASTORE_CACHE_DB_NAME = "myregulars-datastore";
export const DATASTORE_CACHE_STORE_NAME = "snapshots";
export const DATASTORE_OUTBOX_STORE_NAME = "outbox";
export const DATASTORE_CACHE_DB_VERSION = 2;

export const GITHUB_AUTH_COOKIE_NAME = "myregulars-github-oauth-state";
export const GITHUB_AUTH_MESSAGE_TYPE = "myregulars:github-oauth";
export const GITHUB_OAUTH_SCOPE = "gist";
export const GITHUB_OAUTH_START_PATH = "/api/auth/github/start";
export const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_GISTS_API_URL = "https://api.github.com/gists";

// Hosted (PocketBase) vault provider — social logins surfaced on /connect.
// The `id` is the PocketBase OAuth2 provider name; the `label` is shown in UI.
export const HOSTED_AUTH_PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Meta" },
  { id: "twitter", label: "X" },
] as const;

export type HostedAuthProvider = (typeof HOSTED_AUTH_PROVIDERS)[number];
export type HostedAuthProviderId = HostedAuthProvider["id"];
