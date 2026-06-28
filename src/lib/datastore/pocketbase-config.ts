import PocketBase from "pocketbase";

import { HostedNotConfiguredError } from "@/lib/datastore/errors";

/**
 * Base URL of the PocketBase instance backing hosted vaults. Public because the
 * browser talks to PocketBase directly. Empty when hosted vaults are disabled.
 */
export const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "";

let sharedClient: PocketBase | null = null;

/** Whether a PocketBase instance has been configured for hosted vaults. */
export function isHostedConfigured(): boolean {
  return POCKETBASE_URL.length > 0;
}

/**
 * Returns the process-wide PocketBase client. Its `authStore` persists the
 * signed-in account (via localStorage) and is shared by the adapter and the
 * hosted auth helpers so a single login powers every hosted-vault operation.
 */
export function getPocketBaseClient(): PocketBase {
  if (!isHostedConfigured()) {
    throw new HostedNotConfiguredError();
  }

  if (!sharedClient) {
    sharedClient = new PocketBase(POCKETBASE_URL);
  }

  return sharedClient;
}
