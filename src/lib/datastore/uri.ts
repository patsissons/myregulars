import { DatastoreValidationError } from "@/lib/datastore/errors";
import type { DatastoreConnection, DatastoreUri } from "@/lib/datastore/types";

const GIST_ID_PATTERN = /^[A-Za-z0-9]+$/;

function assertGistId(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || !GIST_ID_PATTERN.test(trimmed)) {
    throw new DatastoreValidationError(`Invalid gist id: ${value}`);
  }

  return trimmed;
}

export function formatDatastoreUri(gistId: string): DatastoreUri {
  return `gist:${assertGistId(gistId)}`;
}

export function getGistIdFromUri(uri: DatastoreUri): string {
  return assertGistId(uri.slice("gist:".length));
}

export function normalizeDatastoreUri(input: string): DatastoreUri {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new DatastoreValidationError("A datastore URI is required.");
  }

  if (trimmed.startsWith("gist:")) {
    return formatDatastoreUri(trimmed.slice("gist:".length));
  }

  try {
    const url = new URL(trimmed);
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
  const normalizedGistId = assertGistId(gistId);

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

export function resolveDatastoreConnection(input: string, baseUrl?: string): DatastoreConnection {
  const uri = normalizeDatastoreUri(input);
  const gistId = getGistIdFromUri(uri);

  return {
    uri,
    gistId,
    shareUrl: buildShareUrl(gistId, baseUrl),
  };
}
