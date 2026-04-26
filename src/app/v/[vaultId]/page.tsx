"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useVault } from "@/lib/vault-context";

export default function VaultPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  const router = useRouter();
  const { vault, isReadOnly, addLocation, updateVaultName } = useVault();
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // On desktop, redirect to first location when vault is ready
  useEffect(() => {
    if (vault && vault.locations.length > 0 && window.innerWidth >= 1024) {
      router.replace(`/v/${vaultId}/l/${vault.locations[0].id}`);
    }
  }, [vault, vaultId, router]);

  const peopleCount =
    vault?.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length ?? 0;

  return (
    <div
      className="flex min-h-screen flex-col lg:hidden"
      style={{
        background: "var(--mr-bg)",
        color: "var(--mr-text)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Mobile header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid var(--mr-edge)" }}
      >
        <button
          type="button"
          onClick={() => router.push("/vaults")}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
          aria-label="Back to vaults"
        >
          <ChevronLeft size={18} style={{ color: "var(--mr-dim)" }} />
        </button>
        <DropdownMenu
          items={[
            {
              label: "Rename vault",
              onClick: () => {
                setRenameValue(vault?.name ?? "");
                setShowRenameModal(true);
              },
            },
            { label: "Close vault", onClick: () => router.push("/vaults") },
          ]}
          trigger={
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
              aria-label="More options"
            >
              <MoreHorizontal size={18} style={{ color: "var(--mr-dim)" }} />
            </button>
          }
        />
      </div>

      <div className="px-5 pt-5 pb-6">
        <Eyebrow className="mb-2 block">Vault</Eyebrow>
        <h1
          className="mb-1"
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "var(--mr-text)",
          }}
        >
          {vault?.name ?? "My Vault"}
        </h1>
        <p className="text-[14px]" style={{ color: "var(--mr-dim)" }}>
          {vault?.locations.length ?? 0} place{vault?.locations.length !== 1 ? "s" : ""} ·{" "}
          {peopleCount} people
        </p>

        {/* Search pill (display only — full search in task 14) */}
        <div
          className="mt-4 flex items-center gap-2 rounded-full px-4 py-2.5"
          style={{ background: "var(--mr-subtle)", border: "1px solid var(--mr-edge)" }}
        >
          <Search size={14} style={{ color: "var(--mr-faint)" }} />
          <span className="text-[14px]" style={{ color: "var(--mr-faint)" }}>
            Search vault
          </span>
        </div>
      </div>

      {/* PLACES section */}
      <div className="px-5">
        <Eyebrow className="mb-3 block">Places</Eyebrow>

        {vault && vault.locations.length > 0 ? (
          <div
            className="flex flex-col overflow-hidden rounded-[14px]"
            style={{ background: "var(--mr-panel)", border: "1px solid var(--mr-edge)" }}
          >
            {vault.locations.map((location, idx) => {
              const pc = location.groups.flatMap((g) => g.people).length;
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => router.push(`/v/${vaultId}/l/${location.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-[14px] text-left transition-colors hover:bg-black/[0.04] active:opacity-70 dark:hover:bg-white/[0.05]"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--mr-edge)" : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[15px] font-[500]"
                      style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
                    >
                      {location.name}
                    </p>
                    <p className="mt-0.5 text-[13px]" style={{ color: "var(--mr-dim)" }}>
                      {location.description ? `${location.description} · ` : ""}
                      {pc} {pc === 1 ? "person" : "people"}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--mr-faint)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mb-4 text-[14px]" style={{ color: "var(--mr-dim)" }}>
            No places yet. Add your first spot.
          </p>
        )}

        {/* Add a place */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("Place name:");
              if (name?.trim()) addLocation(name.trim());
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] py-[14px] text-[14px] font-[500] transition-all hover:brightness-[0.92] active:opacity-70 dark:hover:brightness-[1.1]"
            style={{
              border: "1.5px dashed var(--mr-edge-strong)",
              color: "var(--mr-dim)",
            }}
          >
            <Plus size={16} />
            Add a place
          </button>
        )}
      </div>

      {/* Rename Vault Modal */}
      <Modal
        open={showRenameModal}
        onOpenChange={(open) => {
          setShowRenameModal(open);
          if (!open) setRenameValue("");
        }}
        title="Rename vault"
      >
        <div className="flex flex-col gap-4 p-5">
          <Input
            placeholder="Vault name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameValue.trim()) {
                updateVaultName(renameValue.trim());
                setShowRenameModal(false);
                setRenameValue("");
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!renameValue.trim()}
              onClick={() => {
                if (!renameValue.trim()) return;
                updateVaultName(renameValue.trim());
                setShowRenameModal(false);
                setRenameValue("");
              }}
            >
              Rename
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
