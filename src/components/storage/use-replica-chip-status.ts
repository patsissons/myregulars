"use client";

import { useSyncExternalStore } from "react";
import type { SyncStatus } from "@/components/ui/sync-chip";
import { findRegistryEntryByUri } from "@/lib/datastore/registry";
import type { DatastoreUri } from "@/lib/datastore/types";

function subscribe(callback: () => void): () => void {
  // The registry lives in localStorage; other tabs' writes arrive as storage
  // events, this tab's writes are followed by a store update that re-renders.
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * The sync chip's override for mirror trouble recorded on the registry entry:
 * `mirrorPending` when the last save never reached the other copy. Undefined
 * lets the chip derive its state from the store.
 */
export function useReplicaChipStatus(uri: DatastoreUri): SyncStatus | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (findRegistryEntryByUri(uri)?.pendingMirror ? "mirrorPending" : undefined),
    () => undefined,
  );
}
