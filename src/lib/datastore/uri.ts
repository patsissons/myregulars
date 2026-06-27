import { DatastoreValidationError } from "@/lib/datastore/errors";
import type { DatastoreConnection, DatastoreProviderId, DatastoreUri } from "@/lib/datastore/types";

const ID_PATTERN = /^[A-Za-z0-9]+$/;

const GIST_SCHEME = "gist:";
const HOSTED_SCHEME = "hosted:";

function assertId(value: string, label: string): string {
  const trimmed = value.trim();

  if (!trimmed || !ID_PATTERN.test(trimmed)) {
    throw new DatastoreValidationError(`Invalid ${label} id: ${value}`);
  }

  return trimmed;
}

export function formatDatastoreUri(gistId: string): DatastoreUri {
  return `gist:${assertId(gistId, "gist")}`;
}

export function formatHostedUri(recordId: string): DatastoreUri {
  return `hosted:${assertId(recordId, "hosted")}`;
}

export function getProviderFromUri(uri: DatastoreUri): DatastoreProviderId {
  return uri.startsWith(HOSTED_SCHEME) ? "hosted" : "gist";
}

export function getGistIdFromUri(uri: DatastoreUri): string {
  if (!uri.startsWith(GIST_SCHEME)) {
    throw new DatastoreValidationError(`Not a gist URI: ${uri}`);
  }

  return assertId(uri.slice(GIST_SCHEME.length), "gist");
}

export function getHostedIdFromUri(uri: DatastoreUri): string {
  if (!uri.startsWith(HOSTED_SCHEME)) {
    throw new DatastoreValidationError(`Not a hosted URI: ${uri}`);
  }

  return assertId(uri.slice(HOSTED_SCHEME.length), "hosted");
}

export function getIdFromUri(uri: DatastoreUri): string {
  return getProviderFromUri(uri) === "hosted" ? getHostedIdFromUri(uri) : getGistIdFromUri(uri);
}

/**
 * The `[vaultId]` route segment for a vault. Gist vaults keep their bare id for
 * backwards-compatible URLs; hosted vaults carry the full `hosted:<id>` so the
 * provider survives a round-trip through normalizeDatastoreUri.
 */
export function getVaultRouteSegment(uri: DatastoreUri): string {
  return getProviderFromUri(uri) === "hosted" ? uri : getGistIdFromUri(uri);
}

/** The full `/v/...` path for a vault, with the segment URL-encoded. */
export function getVaultRoutePath(uri: DatastoreUri): string {
  return `/v/${encodeURIComponent(getVaultRouteSegment(uri))}`;
}

export function normalizeDatastoreUri(input: string): DatastoreUri {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new DatastoreValidationError("A datastore URI is required.");
  }

  if (trimmed.startsWith(HOSTED_SCHEME)) {
    return formatHostedUri(trimmed.slice(HOSTED_SCHEME.length));
  }

  if (trimmed.startsWith(GIST_SCHEME)) {
    return formatDatastoreUri(trimmed.slice(GIST_SCHEME.length));
  }

  try {
    const url = new URL(trimmed);

    const vaultQuery = url.searchParams.get("vault");

    if (vaultQuery) {
      return normalizeDatastoreUri(vaultQuery);
    }

    const gistQuery = url.searchParams.get("gist");

    if (gistQuery) {
      return formatDatastoreUri(gistQuery);
    }

    if (url.hostname === "api.github.com" && url.pathname.startsWith("/gists/")) {
      const [, , gistId] = url.pathname.split("/");
      return formatDatastoreUri(gistId ?? "");
    }

    if (url.hostname === "gist.github.com") {
      const gistId = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
      return formatDatastoreUri(gistId);
    }
  } catch {
    return formatDatastoreUri(trimmed);
  }

  throw new DatastoreValidationError(`Unsupported datastore URI format: ${input}`);
}

export function buildShareUrl(gistId: string, baseUrl?: string): string {
  const normalizedGistId = assertId(gistId, "gist");

  if (!baseUrl && typeof window !== "undefined") {
    baseUrl = window.location.origin;
  }

  if (!baseUrl) {
    return `/?gist=${encodeURIComponent(normalizedGistId)}`;
  }

  const url = new URL("/", baseUrl);
  url.searchParams.set("gist", normalizedGistId);
  return url.toString();
}

export function buildVaultShareUrl(uri: DatastoreUri, baseUrl?: string): string {
  if (getProviderFromUri(uri) === "gist") {
    return buildShareUrl(getGistIdFromUri(uri), baseUrl);
  }

  if (!baseUrl && typeof window !== "undefined") {
    baseUrl = window.location.origin;
  }

  if (!baseUrl) {
    return `/?vault=${encodeURIComponent(uri)}`;
  }

  const url = new URL("/", baseUrl);
  url.searchParams.set("vault", uri);
  return url.toString();
}

export function resolveDatastoreConnection(input: string, baseUrl?: string): DatastoreConnection {
  const uri = normalizeDatastoreUri(input);
  const provider = getProviderFromUri(uri);
  const id = getIdFromUri(uri);

  return {
    uri,
    provider,
    id,
    ...(provider === "gist" ? { gistId: id } : {}),
    shareUrl: buildVaultShareUrl(uri, baseUrl),
  };
}
