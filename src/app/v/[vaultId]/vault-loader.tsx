"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVault } from "@/lib/vault-context";

interface VaultLoaderProps {
  vaultId: string;
  children: React.ReactNode;
}

/**
 * Opens the vault for this route. The store is cache-first, so a previously
 * seen vault paints immediately and only a first-ever open shows the spinner.
 */
export function VaultLoader({ vaultId, children }: VaultLoaderProps) {
  const { vault, isLoading, error, openVault } = useVault();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const version = params.get("version");
    void openVault(vaultId, version ? { version } : undefined);
  }, [vaultId, openVault]);

  if (!vault && error) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-4"
        style={{ background: "var(--mr-bg)" }}
      >
        <p className="text-[14px]" style={{ color: "var(--mr-danger)" }}>
          {error}
        </p>
        <Button variant="secondary" onClick={() => void openVault(vaultId)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!vault) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          {isLoading ? "Loading vault…" : ""}
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
