"use client";

import { use } from "react";
import { findPerson, useVault } from "@/lib/vault-context";

export default function PersonPage({
  params,
}: {
  params: Promise<{ vaultId: string; locationId: string; personId: string }>;
}) {
  const { locationId, personId } = use(params);
  const { vault } = useVault();

  const result = findPerson(vault, locationId, personId);

  if (!result) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Person not found.
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
        {result.person.name} — person detail coming soon.
      </span>
    </div>
  );
}
