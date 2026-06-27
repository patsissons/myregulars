import { HOSTED_AUTH_PROVIDERS } from "@/lib/datastore/constants";
import type { HostedAuthProviderId } from "@/lib/datastore/constants";
import { AuthRequiredError, HostedNotConfiguredError } from "@/lib/datastore/errors";
import { getPocketBaseClient, isHostedConfigured } from "@/lib/datastore/pocketbase-config";

export interface HostedUser {
  id: string;
  email?: string;
  name?: string;
}

interface HostedUserRecord {
  id: string;
  email?: string;
  name?: string;
}

/** The social-login providers offered for hosted vaults. */
export function listHostedAuthProviders(): typeof HOSTED_AUTH_PROVIDERS {
  return HOSTED_AUTH_PROVIDERS;
}

/** Current hosted auth token, or null when not configured / signed out. */
export function getHostedAuthToken(): string | null {
  if (!isHostedConfigured()) {
    return null;
  }

  const client = getPocketBaseClient();
  return client.authStore.isValid ? client.authStore.token : null;
}

export function isHostedAuthenticated(): boolean {
  return getHostedAuthToken() !== null;
}

/** The signed-in PocketBase user, or null when not authenticated. */
export function getHostedUser(): HostedUser | null {
  if (!isHostedConfigured()) {
    return null;
  }

  const client = getPocketBaseClient();
  const record = client.authStore.record as HostedUserRecord | null;

  if (!record?.id || !client.authStore.isValid) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    name: record.name,
  };
}

export function clearHostedAuth(): void {
  if (!isHostedConfigured()) {
    return;
  }

  getPocketBaseClient().authStore.clear();
}

/**
 * Starts a social login against PocketBase. The SDK opens an OAuth2 popup,
 * exchanges the code, and persists the session in the shared client's authStore
 * (localStorage). Resolves with the resulting auth token.
 */
export async function beginHostedAuth(provider: HostedAuthProviderId): Promise<string> {
  if (typeof window === "undefined") {
    throw new AuthRequiredError("Hosted auth can only start in the browser.");
  }

  if (!isHostedConfigured()) {
    throw new HostedNotConfiguredError();
  }

  const client = getPocketBaseClient();
  await client.collection("users").authWithOAuth2({ provider });

  const token = getHostedAuthToken();

  if (!token) {
    throw new AuthRequiredError("Hosted authentication did not complete.");
  }

  return token;
}
