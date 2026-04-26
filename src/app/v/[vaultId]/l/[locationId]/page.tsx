"use client";

import { use } from "react";
import { useVault } from "@/lib/vault-context";

export default function LocationPage({
  params,
}: {
  params: Promise<{ vaultId: string; locationId: string }>;
}) {
  const { locationId } = use(params);
  const { vault } = useVault();

  const location = vault?.locations.find((l) => l.id === locationId);

  if (!location) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Location not found.
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--mr-bg)" }}
    >
      <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
        {location.name} — location detail coming soon.
      </span>
    </div>
  );
}
