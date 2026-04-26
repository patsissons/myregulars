"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HardDrive, Droplets, Chrome } from "lucide-react";
import { GitHubMark } from "@/components/icons/github-mark";
import { ProviderRow } from "@/components/provider-row";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/lib/auth-context";

export default function ConnectPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
            description="Recommended · v1 provider"
            icon={<GitHubMark size={18} className="text-mr-text" />}
            enabled={true}
            onClick={handleGitHubConnect}
            isLoading={isLoading}
            error={error}
          />

          <ProviderRow
            name="Local file"
            description="Coming soon"
            icon={<HardDrive size={18} style={{ color: "var(--mr-dim)" }} />}
            enabled={false}
          />

          <ProviderRow
            name="Dropbox"
            description="Coming soon"
            icon={<Droplets size={18} style={{ color: "var(--mr-dim)" }} />}
            enabled={false}
          />

          <ProviderRow
            name="Google Drive"
            description="Coming soon"
            icon={<Chrome size={18} style={{ color: "var(--mr-dim)" }} />}
            enabled={false}
          />
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-center text-[12px] leading-relaxed"
          style={{ color: "var(--mr-faint)" }}
        >
          We never store your data. You&apos;ll be redirected to GitHub to authorize a private Gist.
        </p>
      </div>
    </div>
  );
}
