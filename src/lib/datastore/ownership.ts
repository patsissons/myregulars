import { getGitHubAuthToken } from "@/lib/datastore/auth";
import { REQUEST_TIMEOUT_MS } from "@/lib/datastore/constants";
import { getHostedAuthToken, getHostedUser } from "@/lib/datastore/pocketbase-auth";
import { getGistIdFromUri, getProviderFromUri } from "@/lib/datastore/uri";
import { getAuthenticatedUser } from "@/lib/github-user";
import type { DatastoreUri } from "@/lib/datastore/types";

export interface VaultOwnership {
  ownerHandle: string | null;
  isReadOnly: boolean;
}

/** The auth token used to write to a vault, resolved by provider. */
export function getVaultAuthToken(uri: DatastoreUri): string | null {
  return getProviderFromUri(uri) === "hosted" ? getHostedAuthToken() : getGitHubAuthToken();
}

/**
 * Determines who owns a vault and whether the current user may edit it.
 * Gist ownership compares the gist owner against the authenticated GitHub user;
 * hosted vaults are owner-scoped server-side, so the signed-in account always
 * owns what it can read.
 */
export async function resolveVaultOwnership(uri: DatastoreUri): Promise<VaultOwnership> {
  if (getProviderFromUri(uri) === "hosted") {
    const user = getHostedUser();

    if (!user) {
      return { ownerHandle: null, isReadOnly: true };
    }

    return { ownerHandle: user.name ?? user.email ?? null, isReadOnly: false };
  }

  return resolveGistOwnership(uri);
}

async function resolveGistOwnership(uri: DatastoreUri): Promise<VaultOwnership> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { ownerHandle: null, isReadOnly: true };
  }

  const token = getGitHubAuthToken();
  const gistId = getGistIdFromUri(uri);
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: token
      ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
      : { Accept: "application/vnd.github.v3+json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    return { ownerHandle: null, isReadOnly: true };
  }

  const gistData = (await response.json()) as { owner: { login: string } };
  return {
    ownerHandle: gistData.owner.login,
    isReadOnly: gistData.owner.login !== user.login,
  };
}
