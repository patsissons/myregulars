"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVault } from "@/lib/vault-context";

interface VaultLoaderProps {
  vaultId: string;
  children: React.ReactNode;
}

export function VaultLoader({ vaultId, children }: VaultLoaderProps) {
  const { vault, isLoading, error, loadVault } = useVault();

  useEffect(() => {
    loadVault(vaultId);
  }, [vaultId, loadVault]);

  if (!vault && error) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ background: "var(--mr-bg)" }}
      >
        <p className="text-[14px]" style={{ color: "var(--mr-danger)" }}>
          {error}
        </p>
        <Button variant="secondary" onClick={() => loadVault(vaultId)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!vault || isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Loading vault…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
