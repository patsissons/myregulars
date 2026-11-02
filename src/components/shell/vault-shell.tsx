"use client";

import { useEffect, useState } from "react";
import { Moon, MoreHorizontal, Plus, Sun } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { LocationRow } from "@/components/ui/location-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { LogoMark } from "@/components/logo-mark";
import { useTheme } from "@/components/theme-provider";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { getAllPeople, useVault } from "@/lib/vault-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { useNewPlaceDialog } from "@/components/new-place-dialog";
import { useShareDialog } from "@/components/share-dialog";
import { useVaultDataDialog } from "@/components/vault-data-dialog";
import { useVersionHistoryDialog } from "@/components/version-history-dialog";
import { VaultSearch } from "@/components/vault-search";
import { navigate } from "@/lib/router/history";
import { href, routes, type VaultScopedRoute } from "@/lib/router/routes";
import { useIsMobile } from "@/lib/use-media";

interface VaultShellProps {
  route: VaultScopedRoute;
  children: React.ReactNode;
}

/**
 * Opens the vault named by the route and wraps the vault screens in the
 * shared chrome: banners on every width, plus the top bar and sidebar on
 * desktop. The store is cache-first, so only a first-ever open shows the
 * loading state.
 */
export function VaultShell({ route, children }: VaultShellProps) {
  const { vault, isLoading, error, openVault } = useVault();
  const { uri, version } = route;

  useEffect(() => {
    void openVault(uri, version ? { version } : undefined);
  }, [uri, version, openVault]);

  if (!vault && error) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <p className="text-[14px]" style={{ color: "var(--mr-danger)" }}>
          {error}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void openVault(uri)}>
            Retry
          </Button>
          <Button variant="secondary" onClick={() => navigate(routes.vaults(), { replace: true })}>
            Your vaults
          </Button>
        </div>
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

  return <VaultChrome route={route}>{children}</VaultChrome>;
}

function VaultChrome({ route, children }: VaultShellProps) {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const {
    vault,
    isSyncing,
    isReadOnly,
    isHistoricalVersion,
    historicalVersionId,
    source,
    cloneVault,
    updateVaultName,
    revertToVersion,
  } = useVault();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { uri } = route;

  const { openShare, ShareDialogComponent } = useShareDialog();
  const { openVaultData, VaultDataDialogComponent } = useVaultDataDialog();
  const { openVersionHistory, VersionHistoryDialogComponent } = useVersionHistoryDialog(uri);
  const { openNewPlace, NewPlaceDialogComponent } = useNewPlaceDialog();

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const activeLocationId = route.kind === "vault" ? null : route.locationId;

  const syncLabel = isSyncing ? "syncing…" : source === "cache" ? "offline copy" : "saved";

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

  function handleRenameVault(event?: React.FormEvent) {
    event?.preventDefault();
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
      navigate(routes.vault(uri), { replace: true, transition: "none" });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revert.", { variant: "error" });
    } finally {
      setIsReverting(false);
      setShowRevertModal(false);
    }
  }

  async function handleClone(event?: React.FormEvent) {
    event?.preventDefault();
    if (!cloneName.trim() || isCloning) return;
    setIsCloning(true);
    setCloneError("");
    try {
      const newUri = await cloneVault(cloneName.trim());
      showToast("Vault cloned!");
      setShowCloneModal(false);
      navigate(routes.vault(newUri));
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Failed to clone vault.");
    } finally {
      setIsCloning(false);
    }
  }

  const banners = (
    <>
      {/* Historical version banner */}
      {isHistoricalVersion && historicalVersionId && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
          style={{
            background: "var(--mr-accent-soft)",
            borderBottom: "1px solid var(--mr-accent-soft-border)",
          }}
        >
          <span className="text-[13px] font-[500]" style={{ color: "var(--mr-accent)" }}>
            Viewing version {historicalVersionId.slice(0, 7)}
          </span>
          <div className="flex items-center gap-2">
            <AppLink
              route={routes.vault(uri)}
              replace
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-[500] no-underline transition-all hover:brightness-[0.92] dark:hover:brightness-[1.1]"
              style={{
                background: "var(--mr-subtle)",
                border: "1px solid var(--mr-edge)",
                color: "var(--mr-text)",
              }}
            >
              Back to latest
            </AppLink>
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
              navigate(routes.connect(href(route)));
              return;
            }
            const baseName = vault?.name ?? "Vault";
            setCloneName(`${baseName} — copy`);
            setShowCloneModal(true);
          }}
        />
      )}
    </>
  );

  const dialogs = (
    <>
      {/* Rename Vault */}
      <ResponsiveDialog
        open={showRenameModal}
        onOpenChange={(open) => {
          setShowRenameModal(open);
          if (!open) setRenameValue("");
        }}
        title="Rename vault"
        historyId="rename-vault"
        action={{ label: "Rename", form: "rename-vault-form", disabled: !renameValue.trim() }}
        footer={
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="rename-vault-form"
              variant="primary"
              disabled={!renameValue.trim()}
            >
              Rename
            </Button>
          </div>
        }
      >
        <form id="rename-vault-form" onSubmit={handleRenameVault} className="p-5">
          <Input
            placeholder="Vault name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoCapitalize="words"
            enterKeyHint="done"
            autoFocus
          />
        </form>
      </ResponsiveDialog>

      {/* Clone */}
      <ResponsiveDialog
        open={showCloneModal}
        onOpenChange={(open) => {
          setShowCloneModal(open);
          if (!open) {
            setCloneName("");
            setCloneError("");
          }
        }}
        title="Clone vault"
        historyId="clone-vault"
        action={{
          label: isCloning ? "Cloning…" : "Clone",
          form: "clone-vault-form",
          disabled: !cloneName.trim() || isCloning,
        }}
        footer={
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="secondary" onClick={() => setShowCloneModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="clone-vault-form"
              variant="primary"
              disabled={!cloneName.trim() || isCloning}
            >
              {isCloning ? "Cloning…" : "Clone vault"}
            </Button>
          </div>
        }
      >
        <form id="clone-vault-form" onSubmit={handleClone} className="flex flex-col gap-4 p-5">
          <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
            A copy of this vault will be saved to your own storage.
          </p>
          <Input
            placeholder="Vault name"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            autoCapitalize="words"
            enterKeyHint="done"
            autoFocus
          />
          {cloneError && (
            <p className="text-[13px]" style={{ color: "var(--mr-danger)" }}>
              {cloneError}
            </p>
          )}
        </form>
      </ResponsiveDialog>

      {/* Revert Confirmation */}
      <ResponsiveDialog
        open={showRevertModal}
        onOpenChange={setShowRevertModal}
        title="Revert to this version"
        action={{
          label: isReverting ? "Reverting…" : "Revert",
          onClick: () => void handleRevert(),
          disabled: isReverting,
        }}
        footer={
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="secondary" onClick={() => setShowRevertModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRevert} disabled={isReverting}>
              {isReverting ? "Reverting…" : "Revert"}
            </Button>
          </div>
        }
      >
        <p className="p-5 text-[14px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
          This will create a new version with the data from version{" "}
          <strong className="font-mono" style={{ color: "var(--mr-text)" }}>
            {historicalVersionId?.slice(0, 7)}
          </strong>
          . Your current latest version will still be available in history.
        </p>
      </ResponsiveDialog>

      {ShareDialogComponent}
      {VaultDataDialogComponent}
      {VersionHistoryDialogComponent}
      {NewPlaceDialogComponent}
    </>
  );

  if (isMobile) {
    return (
      <div
        className="flex min-h-dvh flex-col"
        style={{
          background: "var(--mr-bg)",
          ...(isHistoricalVersion ? { boxShadow: "inset 0 0 0 3px var(--mr-accent)" } : undefined),
        }}
      >
        {banners}
        {children}
        {dialogs}
      </div>
    );
  }

  return (
    <div
      className="flex h-dvh flex-col"
      style={{
        background: "var(--mr-bg)",
        ...(isHistoricalVersion ? { boxShadow: "inset 0 0 0 3px var(--mr-accent)" } : undefined),
      }}
    >
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center gap-2"
        style={{
          height: 46,
          padding: "0 16px",
          borderBottom: "1px solid var(--mr-edge)",
          background: "var(--mr-panel)",
        }}
      >
        <AppLink
          route={routes.vault(uri)}
          className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 no-underline transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
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
        </AppLink>

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
              { label: "Close vault", onClick: () => navigate(routes.vaults()) },
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

      {banners}

      {/* Body: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <div
          className="flex w-[268px] shrink-0 flex-col overflow-y-auto"
          style={{
            borderRight: "1px solid var(--mr-edge)",
            background: "var(--mr-panel)",
          }}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <VaultSearch uri={uri} />
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
                onClick={() => navigate(routes.location(uri, location.id))}
              />
            ))}
          </div>

          {/* + New place */}
          {!isReadOnly && (
            <div className="px-3 pt-1 pb-2">
              <button
                type="button"
                onClick={openNewPlace}
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
                    onClick={() => navigate(routes.person(uri, location.id, person.id))}
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

        {/* Center + right rail. data-scroll-region: the router restores this pane's scroll. */}
        <div className="flex min-w-0 flex-1">
          <div data-scroll-region className="min-w-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {dialogs}
    </div>
  );
}
