"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getRouterState,
  getServerRouterState,
  popSheetEntry,
  pushSheetEntry,
  subscribeRouter,
  type RouterState,
} from "@/lib/router/history";

/** The current router state, or null before the router has initialized. */
export function useRouterState(): RouterState | null {
  return useSyncExternalStore(subscribeRouter, getRouterState, getServerRouterState);
}

/**
 * Ties a sheet/dialog's `open` flag to a history entry so the system Back
 * gesture closes it instead of leaving the screen. Closing from the UI pops
 * the entry; a reload drops the entry, after which this is a no-op.
 */
export function useHistorySheet(
  id: string | null | undefined,
  open: boolean,
  onClose: () => void,
): void {
  const routerState = useRouterState();
  const wasOpen = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!id) return;
    if (open && !wasOpen.current) {
      pushSheetEntry(id);
    } else if (!open && wasOpen.current) {
      popSheetEntry(id);
    }
    wasOpen.current = open;
  }, [open, id]);

  useEffect(() => {
    if (!id) return;
    // The entry disappeared (system Back) while the UI still shows the sheet.
    // Read live state: the effect above may have just pushed the entry in the
    // same commit, before the subscription re-rendered us.
    if (open && wasOpen.current && getRouterState() && getRouterState()?.sheet !== id) {
      onCloseRef.current();
    }
  }, [routerState, open, id]);
}
