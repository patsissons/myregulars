"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Server } from "lucide-react";
import { GitHubMark } from "@/components/icons/github-mark";
import { HostedProviderMark } from "@/components/icons/social-marks";
import { ProviderRow } from "@/components/provider-row";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/lib/auth-context";
import type { HostedAuthProviderId } from "@/lib/datastore/constants";
import { listHostedAuthProviders } from "@/lib/datastore/pocketbase-auth";
import { isHostedConfigured } from "@/lib/datastore/pocketbase-config";

export default function ConnectPage() {
  const router = useRouter();
  const { isAuthenticated, login, loginHosted } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hostedExpanded, setHostedExpanded] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<HostedAuthProviderId | null>(null);

  const hostedEnabled = isHostedConfigured();

  // Read ?returnTo= from URL (client-only)
  const returnTo =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("returnTo") ?? "/vaults")
      : "/vaults";

  useEffect(() => {
    if (isAuthenticated) {
      router.push(returnTo);
    }
  }, [isAuthenticated, returnTo, router]);

  async function handleGitHubConnect() {
    setIsLoading(true);
    setError("");
    try {
      await login();
      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub authorization failed.");
      setIsLoading(false);
    }
  }

  async function handleHostedConnect(provider: HostedAuthProviderId) {
    setPendingProvider(provider);
    setError("");
    try {
      await loginHosted(provider);
      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPendingProvider(null);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--mr-bg)", color: "var(--mr-text)" }}
    >
      <div className="mx-auto w-full max-w-[480px] px-5 py-6">
        {/* Back button */}
        <IconButton
          icon={ChevronLeft}
          label="Go back"
          onClick={() => router.back()}
          className="mb-4"
        />

        {/* Header */}
        <div className="mb-6">
          <h1
            className="mb-2"
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--mr-text)",
            }}
          >
            Connect a datastore
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
            Your vaults live in your own datastore. Pick a provider — you can always add more later.
          </p>
        </div>

        {/* Provider list */}
        <div className="flex flex-col gap-[10px]">
          <ProviderRow
            name="GitHub Gists"
            description="Store each vault in a private Gist"
            icon={<GitHubMark size={18} className="text-mr-text" />}
            enabled={true}
            onClick={handleGitHubConnect}
            isLoading={isLoading}
            error={error && !pendingProvider ? error : undefined}
          />

          {hostedEnabled && (
            <div className="flex flex-col gap-[10px]">
              <ProviderRow
                name="Hosted vault"
                description={
                  hostedExpanded ? "Choose a sign-in method" : "Sign in to sync to a hosted account"
                }
                icon={<Server size={18} style={{ color: "var(--mr-text)" }} />}
                enabled={true}
                onClick={() => setHostedExpanded((open) => !open)}
              />

              {hostedExpanded && (
                <div className="flex flex-col gap-2 pl-2">
                  {listHostedAuthProviders().map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleHostedConnect(provider.id)}
                      disabled={pendingProvider !== null}
                      className="hover:bg-mr-subtle flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-colors disabled:cursor-not-allowed"
                      style={{ background: "var(--mr-panel)", borderColor: "var(--mr-edge)" }}
                    >
                      <HostedProviderMark provider={provider.id} size={18} />
                      <span
                        className="flex-1 text-[14px] font-[500]"
                        style={{ color: "var(--mr-text)" }}
                      >
                        Continue with {provider.label}
                      </span>
                      {pendingProvider === provider.id && (
                        <Loader2
                          size={16}
                          className="animate-spin"
                          style={{ color: "var(--mr-dim)" }}
                        />
                      )}
                    </button>
                  ))}
                  {error && pendingProvider === null && (
                    <p className="px-1 text-[13px]" style={{ color: "var(--mr-danger)" }}>
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-center text-[12px] leading-relaxed"
          style={{ color: "var(--mr-faint)" }}
        >
          We never store your data. GitHub Gists keep vaults in your account; hosted vaults sync to
          your signed-in account.
        </p>
      </div>
    </div>
  );
}
