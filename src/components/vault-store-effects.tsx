"use client";

import { useEffect } from "react";
import { useOptionalToast } from "@/components/ui/toast";
import { subscribeVaultEvents, vaultActions } from "@/lib/vault-store";

/**
 * Connects the module-level vault store to the page: surfaces its events as
 * toasts, and flushes pending saves when the tab is hidden or unloaded so an
 * edit made just before backgrounding the app isn't lost. Mount once, at the
 * root.
 */
export function VaultStoreEffects() {
  const toast = useOptionalToast();

  useEffect(() => {
    return subscribeVaultEvents((event) => {
      if (event.type === "toast") {
        toast?.showToast(event.message, event.variant ? { variant: event.variant } : undefined);
      }
    });
  }, [toast]);

  useEffect(() => {
    function flush() {
      void vaultActions.flushPendingSave();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
