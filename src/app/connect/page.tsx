"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Server } from "lucide-react";
import { GitHubMark } from "@/components/icons/github-mark";
import { HostedAuthButtons } from "@/components/hosted-auth-buttons";
import { ProviderRow } from "@/components/provider-row";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/lib/auth-context";
import { isHostedConfigured } from "@/lib/datastore/pocketbase-config";

export default function ConnectPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hostedExpanded, setHostedExpanded] = useState(false);

  const hostedEnabled = isHostedConfigured();

  // Read ?returnTo= from URL (client-only)
  const returnTo =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("returnTo") ?? "/vaults")
      : "/vaults";

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
            Choose where your vaults are stored. Each provider keeps your data in a different place
            — you can always add more later.
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
            error={error || undefined}
          />

          {hostedEnabled && (
            <div className="flex flex-col gap-[10px]">
              <ProviderRow
                name="Hosted vault"
                description={
                  hostedExpanded
                    ? "Choose a sign-in method"
                    : "Stored on a hosted server · sign-in required"
                }
                icon={<Server size={18} style={{ color: "var(--mr-text)" }} />}
                enabled={true}
                expanded={hostedExpanded}
                onClick={() => setHostedExpanded((open) => !open)}
              />

              {hostedExpanded && (
                <HostedAuthButtons onAuthenticated={() => router.push(returnTo)} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-center text-[12px] leading-relaxed"
          style={{ color: "var(--mr-faint)" }}
        >
          GitHub Gists keep your vaults in your own GitHub account — we never store them. Hosted
          vaults are stored on the hosted server you sign into.
        </p>
      </div>
    </div>
  );
}
