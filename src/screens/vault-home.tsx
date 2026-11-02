"use client";

import { useState } from "react";
import { ChevronRight, MoreHorizontal, Plus, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Eyebrow } from "@/components/ui/eyebrow";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SyncChip } from "@/components/ui/sync-chip";
import { PageHeader } from "@/components/shell/page-header";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { getAllPeople, useVault } from "@/lib/vault-context";
import { VaultSearch } from "@/components/vault-search";
import { useNewPlaceDialog } from "@/components/new-place-dialog";
import { useShareDialog } from "@/components/share-dialog";
import { useStorageSheet } from "@/components/storage/storage-sheet";
import { useReplicaChipStatus } from "@/components/storage/use-replica-chip-status";
import { useVaultDataDialog } from "@/components/vault-data-dialog";
import { useVersionHistoryDialog } from "@/components/version-history-dialog";
import { goBack, navigate } from "@/lib/router/history";
import { routes, type Route } from "@/lib/router/routes";
import { useIsMobile } from "@/lib/use-media";

interface VaultHomeScreenProps {
  route: Extract<Route, { kind: "vault" }>;
}

export function VaultHomeScreen({ route }: VaultHomeScreenProps) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileVaultHome route={route} /> : <DesktopVaultOverview route={route} />;
}

function DesktopVaultOverview({ route }: VaultHomeScreenProps) {
  const { vault } = useVault();
  const { uri, version } = route;

  const peopleCount =
    vault?.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length ?? 0;

  // Recent people: top 8 by lastSeen across all locations
  const recentPeople = getAllPeople(vault)
    .filter(({ person }) => Boolean(person.lastSeen))
    .sort((a, b) => (b.person.lastSeen ?? "").localeCompare(a.person.lastSeen ?? ""))
    .slice(0, 8);

  return (
    <div className="h-full" style={{ background: "var(--mr-bg)" }}>
      <div className="mx-auto w-full max-w-[680px] px-8 py-10">
        <Eyebrow className="mb-2 block">Vault</Eyebrow>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "var(--mr-text)",
          }}
        >
          {vault?.name ?? "My Vault"}
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: "var(--mr-dim)" }}>
          {vault?.locations.length ?? 0} place{vault?.locations.length !== 1 ? "s" : ""} ·{" "}
          {peopleCount} people
        </p>

        {recentPeople.length > 0 && (
          <div className="mt-8">
            <Eyebrow className="mb-3 block">Recent people</Eyebrow>
            <div
              className="flex flex-col overflow-hidden rounded-[14px]"
              style={{ background: "var(--mr-panel)", border: "1px solid var(--mr-edge)" }}
            >
              {recentPeople.map(({ person, location }, idx) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => navigate(routes.person(uri, location.id, person.id, version))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  style={{ borderTop: idx > 0 ? "1px solid var(--mr-edge)" : undefined }}
                >
                  <Avatar name={person.name} size={28} photoUrl={person.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[14px] font-[500]"
                      style={{ color: "var(--mr-text)" }}
                    >
                      {person.name}
                    </p>
                    <p className="truncate text-[12px]" style={{ color: "var(--mr-dim)" }}>
                      {location.name}
                    </p>
                  </div>
                  {person.lastSeen && (
                    <span className="shrink-0 text-[12px]" style={{ color: "var(--mr-faint)" }}>
                      {formatLastSeen(person.lastSeen)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Select a place from the sidebar to see who&apos;s there.
        </p>
      </div>
    </div>
  );
}

function MobileVaultHome({ route }: VaultHomeScreenProps) {
  const { vault, isReadOnly, updateVaultName } = useVault();
  const { uri, version } = route;
  const { openShare, ShareDialogComponent } = useShareDialog();
  const { openVaultData, VaultDataDialogComponent } = useVaultDataDialog();
  const { openVersionHistory, VersionHistoryDialogComponent } = useVersionHistoryDialog(uri);
  const { openNewPlace, NewPlaceDialogComponent } = useNewPlaceDialog();
  const { openStorage, StorageSheetComponent } = useStorageSheet(uri);
  const chipStatus = useReplicaChipStatus(uri);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const peopleCount =
    vault?.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length ?? 0;

  function handleRename(event?: React.FormEvent) {
    event?.preventDefault();
    if (!renameValue.trim()) return;
    updateVaultName(renameValue.trim());
    setShowRenameModal(false);
    setRenameValue("");
  }

  return (
    <div
      className="safe-x flex min-h-dvh flex-col"
      style={{
        background: "var(--mr-bg)",
        color: "var(--mr-text)",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
      }}
    >
      <PageHeader
        onBack={goBack}
        backLabel="Back to vaults"
        right={
          <>
            <SyncChip compact className="mr-1" status={chipStatus} onClick={openStorage} />
            <IconButton icon={Share2} label="Share vault" onClick={openShare} />
            <DropdownMenu
              title={vault?.name}
              items={[
                ...(isReadOnly
                  ? []
                  : [
                      {
                        label: "Rename vault",
                        onClick: () => {
                          setRenameValue(vault?.name ?? "");
                          setShowRenameModal(true);
                        },
                      },
                    ]),
                { label: "Storage…", onClick: openStorage },
                { label: "View vault data", onClick: openVaultData },
                { label: "Version history", onClick: openVersionHistory },
                { label: "Close vault", onClick: () => navigate(routes.vaults()) },
              ]}
              trigger={<IconButton icon={MoreHorizontal} label="More options" />}
            />
          </>
        }
      />

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

        {/* Vault-wide people search */}
        <VaultSearch uri={uri} version={version} showShortcut={false} className="mt-4" />
      </div>

      {/* PLACES section */}
      <div className="px-5">
        <Eyebrow className="mb-3 block">Places</Eyebrow>

        {vault && vault.locations.length > 0 ? (
          <div
            className="flex flex-col overflow-hidden rounded-[14px]"
            style={{ background: "var(--mr-panel)", border: "1px solid var(--mr-edge)" }}
          >
            {[...vault.locations]
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
              .map((location, idx) => {
                const pc = location.groups.flatMap((g) => g.people).length;
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => navigate(routes.location(uri, location.id, version))}
                    className="flex min-h-[56px] w-full items-center gap-3 px-4 py-[14px] text-left transition-colors hover:bg-black/[0.04] active:opacity-70 dark:hover:bg-white/[0.05]"
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
          <Button
            variant="dashed"
            size="lg"
            fullWidth
            onClick={openNewPlace}
            className="mt-3 min-h-[52px] rounded-[14px]"
          >
            <Plus size={16} aria-hidden="true" />
            Add a place
          </Button>
        )}
      </div>

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
        <form id="rename-vault-form" onSubmit={handleRename} className="p-5">
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

      {ShareDialogComponent}
      {StorageSheetComponent}
      {VaultDataDialogComponent}
      {VersionHistoryDialogComponent}
      {NewPlaceDialogComponent}
    </div>
  );
}
