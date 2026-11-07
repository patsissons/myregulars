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

export interface OwnershipContext {
  /**
   * Hosted only: the record's owner id from the last read. When known, the
   * vault is writable only by that account (public vaults are readable by
   * anyone). When unknown, a signed-in account is assumed to own what it read.
   */
  ownerId?: string | null;
}

/** The auth token used to write to a vault, resolved by provider. */
export function getVaultAuthToken(uri: DatastoreUri): string | null {
  return getProviderFromUri(uri) === "hosted" ? getHostedAuthToken() : getGitHubAuthToken();
}

/**
 * Determines who owns a vault and whether the current user may edit it.
 * Gist ownership compares the gist owner against the authenticated GitHub
 * user; hosted ownership compares the record's owner against the signed-in
 * account.
 */
export async function resolveVaultOwnership(
  uri: DatastoreUri,
  context: OwnershipContext = {},
): Promise<VaultOwnership> {
  if (getProviderFromUri(uri) === "hosted") {
    const user = getHostedUser();

    if (!user) {
      return { ownerHandle: null, isReadOnly: true };
    }

    if (context.ownerId && context.ownerId !== user.id) {
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
