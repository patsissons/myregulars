"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { HostedProviderMark } from "@/components/icons/social-marks";
import { useAuth } from "@/lib/auth-context";
import {
  fetchEnabledHostedProviders,
  listHostedAuthProviders,
} from "@/lib/datastore/pocketbase-auth";
import type { HostedAuthProvider, HostedAuthProviderId } from "@/lib/datastore/constants";

interface HostedAuthButtonsProps {
  /** Called after a successful sign-in. */
  onAuthenticated?: () => void;
}

/**
 * Social-login buttons for hosted vaults. Shows the providers actually enabled
 * on the PocketBase instance; if the instance can't be reached it falls back to
 * the full supported list so the UI still renders.
 */
export function HostedAuthButtons({ onAuthenticated }: HostedAuthButtonsProps) {
  const { loginHosted } = useAuth();
  const [providers, setProviders] = useState<readonly HostedAuthProvider[] | null>(null);
  const [pending, setPending] = useState<HostedAuthProviderId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchEnabledHostedProviders().then((enabled) => {
      if (cancelled) return;
      // null = instance unreachable -> fall back to the supported list.
      setProviders(enabled ?? listHostedAuthProviders());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect(id: HostedAuthProviderId) {
    setPending(id);
    setError("");
    try {
      await loginHosted(id);
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPending(null);
    }
  }

  if (providers === null) {
    return (
      <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
        Loading sign-in options…
      </p>
    );
  }

  if (providers.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
        No hosted sign-in providers are configured yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleConnect(provider.id)}
          disabled={pending !== null}
          className="bg-mr-panel border-mr-edge hover:bg-mr-subtle flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-colors disabled:cursor-not-allowed"
        >
          <HostedProviderMark provider={provider.id} size={18} />
          <span className="flex-1 text-[14px] font-[500]" style={{ color: "var(--mr-text)" }}>
            Continue with {provider.label}
          </span>
          {pending === provider.id && (
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--mr-dim)" }} />
          )}
        </button>
      ))}
      {error && (
        <p className="px-1 text-[13px]" style={{ color: "var(--mr-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
