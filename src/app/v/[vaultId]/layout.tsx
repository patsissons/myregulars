"use client";

import { use, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, MoreHorizontal, Plus, Sun } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { LocationRow } from "@/components/ui/location-row";
import { Modal } from "@/components/ui/modal";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { LogoMark } from "@/components/logo-mark";
import { useTheme } from "@/components/theme-provider";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { getVaultRoutePath } from "@/lib/datastore/uri";
import { getAllPeople, VaultProvider, useVault } from "@/lib/vault-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { useShareDialog } from "@/components/share-dialog";
import { useVaultDataDialog } from "@/components/vault-data-dialog";
import { useVersionHistoryDialog } from "@/components/version-history-dialog";
import { useDuplicateConfirm } from "@/components/duplicate-confirm-dialog";
import { LayoutTransition } from "@/components/layout-transition";
import { VaultSearch } from "@/components/vault-search";
import { VaultLoader } from "./vault-loader";

interface VaultShellProps {
  vaultId: string;
  children: React.ReactNode;
}

function VaultShell({ vaultId, children }: VaultShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const {
    vault,
    isSyncing,
    isReadOnly,
    isHistoricalVersion,
    historicalVersionId,
    addLocation,
    cloneVault,
    updateVaultName,
    revertToVersion,
  } = useVault();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const { openShare, ShareDialogComponent } = useShareDialog();
  const { openVaultData, VaultDataDialogComponent } = useVaultDataDialog();
  const { openVersionHistory, VersionHistoryDialogComponent } = useVersionHistoryDialog(vaultId);
  const { checkDuplicate, DuplicateConfirmDialogComponent } = useDuplicateConfirm();

  const [showNewPlaceModal, setShowNewPlaceModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceDesc, setNewPlaceDesc] = useState("");
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Parse active locationId from URL
  const locationMatch = pathname.match(/\/v\/[^/]+\/l\/([^/]+)/);
  const activeLocationId = locationMatch?.[1] ?? null;

  // Sync label derived in render (no setState needed)
  const syncLabel = isSyncing ? "syncing…" : "saved";

  const filteredLocations = [...(vault?.locations ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  // Recent people: top 5 by lastSeen across all locations
  const recentPeople = getAllPeople(vault)
    .filter(({ person }) => Boolean(person.lastSeen))
    .sort((a, b) => (b.person.lastSeen ?? "").localeCompare(a.person.lastSeen ?? ""))
    .slice(0, 5);

  function getPeopleCount(locationId: string): number {
    const loc = vault?.locations.find((l) => l.id === locationId);
    return loc?.groups.flatMap((g) => g.people).length ?? 0;
  }

  async function handleAddPlace() {
    if (!newPlaceName.trim()) return;
    const existingNames = vault?.locations.map((l) => l.name) ?? [];
    const confirmed = await checkDuplicate("place", newPlaceName.trim(), existingNames);
    if (!confirmed) return;
    addLocation(newPlaceName.trim(), newPlaceDesc.trim() || undefined);
    setShowNewPlaceModal(false);
    setNewPlaceName("");
    setNewPlaceDesc("");
  }

  function handleRenameVault() {
    if (!renameValue.trim()) return;
    updateVaultName(renameValue.trim());
    setShowRenameModal(false);
    setRenameValue("");
  }

  async function handleRevert() {
    setIsReverting(true);
    try {
      await revertToVersion();
      showToast("Reverted successfully");
      globalThis.location.assign(`/v/${vaultId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revert.");
      setIsReverting(false);
    }
  }

  async function handleClone() {
    if (!cloneName.trim()) return;
    setIsCloning(true);
    setCloneError("");
    try {
      const newUri = await cloneVault(cloneName.trim());
      showToast("Vault cloned!");
      router.push(getVaultRoutePath(newUri));
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Failed to clone vault.");
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        background: "var(--mr-bg)",
        ...(isHistoricalVersion ? { boxShadow: "inset 0 0 0 3px var(--mr-accent)" } : undefined),
      }}
    >
      {/* Top bar — desktop only */}
      <div
        className="hidden shrink-0 items-center gap-2 lg:flex"
        style={{
          height: 46,
          padding: "0 16px",
          borderBottom: "1px solid var(--mr-edge)",
          background: "var(--mr-panel)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/v/${vaultId}`)}
          className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
          aria-label="Vault overview"
        >
          <LogoMark size={26} />
          <span
            className="truncate text-[13px] font-[500]"
            style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
          >
            {vault?.name ?? "Vault"}
          </span>
          <span className="shrink-0 text-[11px]" style={{ color: "var(--mr-faint)" }}>
            · {syncLabel}
          </span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openShare}
            className="flex h-[26px] items-center gap-1.5 rounded-full px-3 text-[12px] font-[500] transition-all hover:border-black/50! hover:brightness-[0.92] dark:hover:brightness-[1.1]"
            style={{
              background: "var(--mr-subtle)",
              border: "1px solid var(--mr-edge)",
              color: "var(--mr-text)",
            }}
          >
            Share
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun size={15} style={{ color: "var(--mr-dim)" }} />
            ) : (
              <Moon size={15} style={{ color: "var(--mr-dim)" }} />
            )}
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
              { label: "View vault data", onClick: openVaultData },
              { label: "Version history", onClick: openVersionHistory },
              { label: "Close vault", onClick: () => router.push("/vaults") },
            ]}
            trigger={
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
                aria-label="More options"
              >
                <MoreHorizontal size={15} style={{ color: "var(--mr-dim)" }} />
              </button>
            }
          />
        </div>
      </div>

      {/* Historical version banner */}
      {isHistoricalVersion && historicalVersionId && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: "var(--mr-accent-soft)",
            borderBottom: "1px solid var(--mr-accent-soft-border)",
          }}
        >
          <span className="text-[13px] font-[500]" style={{ color: "var(--mr-accent)" }}>
            Viewing version {historicalVersionId.slice(0, 7)}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={`/v/${vaultId}`}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-[500] no-underline transition-all hover:brightness-[0.92] dark:hover:brightness-[1.1]"
              style={{
                background: "var(--mr-subtle)",
                border: "1px solid var(--mr-edge)",
                color: "var(--mr-text)",
              }}
            >
              Back to latest
            </a>
            <Button variant="primary" size="sm" onClick={() => setShowRevertModal(true)}>
              Revert to this version
            </Button>
          </div>
        </div>
      )}

      {/* Read-only banner */}
      {isReadOnly && !isHistoricalVersion && (
        <ReadOnlyBanner
          onClone={() => {
            if (!isAuthenticated) {
              const returnTo = encodeURIComponent(window.location.href);
              router.push(`/connect?returnTo=${returnTo}`);
              return;
            }
            const baseName = vault?.name ?? "Vault";
            setCloneName(`${baseName} — copy`);
            setShowCloneModal(true);
          }}
        />
      )}

      {/* Body: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — desktop only */}
        <div
          className="hidden w-[268px] shrink-0 flex-col overflow-y-auto lg:flex"
          style={{
            borderRight: "1px solid var(--mr-edge)",
            background: "var(--mr-panel)",
          }}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <VaultSearch vaultId={vaultId} />
          </div>

          {/* PLACES */}
          <div className="px-3 pt-2 pb-1">
            <Eyebrow className="block px-[7px]">Places</Eyebrow>
          </div>
          <div className="flex flex-col gap-[2px] px-3">
            {filteredLocations.map((location) => (
              <LocationRow
                key={location.id}
                location={{
                  name: location.name,
                  description: location.description,
                  peopleCount: getPeopleCount(location.id),
                }}
                active={location.id === activeLocationId}
                onClick={() => router.push(`/v/${vaultId}/l/${location.id}`)}
              />
            ))}
          </div>

          {/* + New place */}
          {!isReadOnly && (
            <div className="px-3 pt-1 pb-2">
              <button
                type="button"
                onClick={() => setShowNewPlaceModal(true)}
                className="flex w-full items-center gap-1.5 rounded-[7px] px-[7px] py-[7px] text-left text-[13px] transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
                style={{ color: "var(--mr-dim)" }}
              >
                <Plus size={13} style={{ flexShrink: 0 }} />
                New place
              </button>
            </div>
          )}

          {/* RECENT PEOPLE */}
          {recentPeople.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1">
                <Eyebrow className="block px-[7px]">Recent people</Eyebrow>
              </div>
              <div className="flex flex-col gap-[2px] px-3 pb-3">
                {recentPeople.map(({ person, location }) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => router.push(`/v/${vaultId}/l/${location.id}/p/${person.id}`)}
                    className="flex w-full items-center gap-2 rounded-[7px] px-[7px] py-[5px] text-left transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
                  >
                    <Avatar name={person.name} size={20} photoUrl={person.photoUrl} />
                    <span
                      className="min-w-0 flex-1 truncate text-[13px]"
                      style={{ color: "var(--mr-text)" }}
                    >
                      {person.name}
                    </span>
                    {person.lastSeen && (
                      <span className="shrink-0 text-[11px]" style={{ color: "var(--mr-faint)" }}>
                        {formatLastSeen(person.lastSeen)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center + right rail */}
        <div className="flex min-w-0 flex-1">
          <LayoutTransition className="min-w-0 flex-1 overflow-y-auto">{children}</LayoutTransition>
        </div>
      </div>

      {/* New Place Modal */}
      <Modal
        open={showNewPlaceModal}
        onOpenChange={(open) => {
          setShowNewPlaceModal(open);
          if (!open) {
            setNewPlaceName("");
            setNewPlaceDesc("");
          }
        }}
        title="New place"
      >
        <div className="flex flex-col gap-4 p-5">
          <Input
            placeholder="The Café Around the Corner"
            value={newPlaceName}
            onChange={(e) => setNewPlaceName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlace()}
            autoFocus
          />
          <Input
            placeholder="Description (optional)"
            value={newPlaceDesc}
            onChange={(e) => setNewPlaceDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlace()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNewPlaceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddPlace} disabled={!newPlaceName.trim()}>
              Add place
            </Button>
          </div>
        </div>
      </Modal>

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
            onKeyDown={(e) => e.key === "Enter" && handleRenameVault()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRenameVault} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clone Modal */}
      <Modal
        open={showCloneModal}
        onOpenChange={(open) => {
          setShowCloneModal(open);
          if (!open) {
            setCloneName("");
            setCloneError("");
          }
        }}
        title="Clone vault"
      >
        <div className="flex flex-col gap-4 p-5">
          <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
            A copy of this vault will be saved to your GitHub Gists.
          </p>
          <Input
            placeholder="Vault name"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isCloning && handleClone()}
            autoFocus
          />
          {cloneError && (
            <p className="text-[13px]" style={{ color: "var(--mr-danger)" }}>
              {cloneError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCloneModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleClone}
              disabled={!cloneName.trim() || isCloning}
            >
              {isCloning ? "Cloning…" : "Clone vault"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revert Confirmation Modal */}
      <Modal
        open={showRevertModal}
        onOpenChange={setShowRevertModal}
        title="Revert to this version"
      >
        <div className="flex flex-col gap-4 p-5">
          <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
            This will create a new version with the data from version{" "}
            <strong className="font-mono" style={{ color: "var(--mr-text)" }}>
              {historicalVersionId?.slice(0, 7)}
            </strong>
            . Your current latest version will still be available in history.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRevertModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRevert} disabled={isReverting}>
              {isReverting ? "Reverting…" : "Revert"}
            </Button>
          </div>
        </div>
      </Modal>

      {ShareDialogComponent}
      {VaultDataDialogComponent}
      {VersionHistoryDialogComponent}
      {DuplicateConfirmDialogComponent}
    </div>
  );
}

export default function VaultLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}) {
  const { vaultId } = use(params);

  return (
    <VaultProvider>
      <VaultLoader vaultId={vaultId}>
        <VaultShell vaultId={vaultId}>{children}</VaultShell>
      </VaultLoader>
    </VaultProvider>
  );
}
