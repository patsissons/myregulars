"use client";

import { use, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, MoreHorizontal, Plus, Sun } from "lucide-react";
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
import { getGistIdFromUri } from "@/lib/datastore/uri";
import { getAllPeople, VaultProvider, useVault } from "@/lib/vault-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { useShareDialog } from "@/components/share-dialog";
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
  const { vault, isSyncing, isReadOnly, addLocation, cloneVault } = useVault();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const { openShare, ShareDialogComponent } = useShareDialog();

  const [showNewPlaceModal, setShowNewPlaceModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceDesc, setNewPlaceDesc] = useState("");
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");

  // Parse active locationId from URL
  const locationMatch = pathname.match(/\/v\/[^/]+\/l\/([^/]+)/);
  const activeLocationId = locationMatch?.[1] ?? null;

  // Sync label derived in render (no setState needed)
  const syncLabel = isSyncing ? "syncing…" : "saved";

  const filteredLocations = vault?.locations ?? [];

  // Recent people: top 5 by lastSeen across all locations
  const recentPeople = getAllPeople(vault)
    .filter(({ person }) => Boolean(person.lastSeen))
    .sort((a, b) => (b.person.lastSeen ?? "").localeCompare(a.person.lastSeen ?? ""))
    .slice(0, 5);

  function getPeopleCount(locationId: string): number {
    const loc = vault?.locations.find((l) => l.id === locationId);
    return loc?.groups.flatMap((g) => g.people).length ?? 0;
  }

  function handleAddPlace() {
    if (!newPlaceName.trim()) return;
    addLocation(newPlaceName.trim(), newPlaceDesc.trim() || undefined);
    setShowNewPlaceModal(false);
    setNewPlaceName("");
    setNewPlaceDesc("");
  }

  async function handleClone() {
    if (!cloneName.trim()) return;
    setIsCloning(true);
    setCloneError("");
    try {
      const newUri = await cloneVault(cloneName.trim());
      const gistId = getGistIdFromUri(newUri);
      showToast("Vault cloned!");
      router.push(`/v/${gistId}`);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Failed to clone vault.");
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--mr-bg)" }}>
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
        {/* Decorative traffic lights */}
        <div className="mr-1 flex items-center gap-[6px]">
          {(["#ff5f57", "#febc2e", "#28c840"] as const).map((color) => (
            <div
              key={color}
              style={{ width: 11, height: 11, borderRadius: "50%", background: color }}
            />
          ))}
        </div>

        <LogoMark size={26} />

        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span
            className="truncate text-[13px] font-[500]"
            style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
          >
            {vault?.name ?? "Vault"}
          </span>
          <span className="shrink-0 text-[11px]" style={{ color: "var(--mr-faint)" }}>
            · {syncLabel}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openShare}
            className="flex h-[26px] items-center gap-1.5 rounded-full px-3 text-[12px] font-[500] transition-opacity hover:opacity-70"
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
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun size={15} style={{ color: "var(--mr-dim)" }} />
            ) : (
              <Moon size={15} style={{ color: "var(--mr-dim)" }} />
            )}
          </button>

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            aria-label="More options"
          >
            <MoreHorizontal size={15} style={{ color: "var(--mr-dim)" }} />
          </button>
        </div>
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
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
                className="flex w-full items-center gap-1.5 rounded-[7px] px-[7px] py-[7px] text-left text-[13px] transition-opacity hover:opacity-70"
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
                    className="flex w-full items-center gap-2 rounded-[7px] px-[7px] py-[5px] text-left transition-opacity hover:opacity-70"
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

      {ShareDialogComponent}
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
