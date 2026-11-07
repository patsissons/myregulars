"use client";

import { useCallback, useRef, useState } from "react";
import { HostedAuthButtons } from "@/components/hosted-auth-buttons";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useAuth } from "@/lib/auth-context";
import { isHostedConfigured } from "@/lib/datastore/pocketbase-config";
import type { DatastoreProviderId } from "@/lib/datastore/types";

export type ProviderAuthStatus = "unconfigured" | "signedOut" | "signedIn";

export interface ProviderAuthState {
  provider: DatastoreProviderId;
  status: ProviderAuthStatus;
  username: string | null;
  signOut: () => void;
}

export const PROVIDER_LABELS: Record<DatastoreProviderId, string> = {
  gist: "GitHub Gist",
  hosted: "Hosted",
};

/** One provider's sign-in state, in the same shape for both providers. */
export function useProviderAuth(provider: DatastoreProviderId): ProviderAuthState {
  const auth = useAuth();
  if (provider === "hosted") {
    return {
      provider,
      status: !isHostedConfigured()
        ? "unconfigured"
        : auth.hosted.isAuthenticated
          ? "signedIn"
          : "signedOut",
      username: auth.hosted.username,
      signOut: auth.logoutHosted,
    };
  }
  return {
    provider,
    status: auth.isAuthenticated ? "signedIn" : "signedOut",
    username: auth.username,
    signOut: auth.logout,
  };
}

/**
 * `ensureSignedIn(provider)` resolves true once the provider is signed in,
 * opening the GitHub popup directly or a hosted sign-in sheet as needed, and
 * false if the user backs out. Render `SignInSheet` once near the caller.
 */
export function useEnsureSignedIn() {
  const auth = useAuth();
  const [hostedOpen, setHostedOpen] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setHostedOpen(false);
  }, []);

  const ensureSignedIn = useCallback(
    async (provider: DatastoreProviderId): Promise<boolean> => {
      if (provider === "gist") {
        if (auth.isAuthenticated) return true;
        try {
          await auth.login();
          return true;
        } catch {
          return false;
        }
      }
      if (!isHostedConfigured()) return false;
      if (auth.hosted.isAuthenticated) return true;
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setHostedOpen(true);
      });
    },
    [auth],
  );

  const SignInSheet = (
    <ResponsiveDialog
      open={hostedOpen}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title="Sign in to Hosted"
      historyId="hosted-sign-in"
    >
      <div className="p-5">
        <HostedAuthButtons onAuthenticated={() => settle(true)} />
      </div>
    </ResponsiveDialog>
  );

  return { ensureSignedIn, SignInSheet };
}
