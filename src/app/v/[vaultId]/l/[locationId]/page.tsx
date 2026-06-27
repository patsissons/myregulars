"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PersonRow } from "@/components/ui/person-row";
import { LocationDetailContent } from "@/components/location-detail-content";
import { EmptyState } from "@/components/empty-state";
import { usePersonFormDialog } from "@/components/person-form-dialog";
import { useToast } from "@/components/ui/toast";
import { useVault } from "@/lib/vault-context";

export default function LocationPage({
  params,
}: {
  params: Promise<{ vaultId: string; locationId: string }>;
}) {
  const { vaultId, locationId } = use(params);
  const router = useRouter();
  const { vault, isReadOnly, logVisit, updateLocation, deleteLocation, deleteGroup } = useVault();
  const { openAdd, DialogComponent } = usePersonFormDialog();
  const { showToast } = useToast();

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const location = vault?.locations.find((l) => l.id === locationId);

  if (!location) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Location not found.
        </span>
      </div>
    );
  }

  // Mobile filter state
  const hasSearch = search.length > 0;

  const visibleGroups = [...location.groups]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .filter((g) => activeGroupId === null || g.id === activeGroupId)
    .map((g) => ({
      ...g,
      people: [...g.people]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .filter((p) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q);
        }),
    }))
    // When searching, hide groups with no matches; otherwise show all groups
    .filter((g) => !hasSearch || g.people.length > 0);

  const hasResults = visibleGroups.some((g) => g.people.length > 0);

  function handleAddPerson() {
    if (!location) return;
    openAdd(locationId, location);
  }

  function handleDeleteGroup(groupId: string, groupName: string, peopleCount: number) {
    if (peopleCount > 0) {
      showToast(
        `Move or remove all ${peopleCount} ${peopleCount === 1 ? "person" : "people"} in "${groupName}" first.`,
      );
      return;
    }
    deleteGroup(locationId, groupId);
    if (activeGroupId === groupId) setActiveGroupId(null);
  }

  function handleRenamePlace() {
    if (!renameValue.trim()) return;
    updateLocation(locationId, { name: renameValue.trim() });
    setShowRenameModal(false);
    setRenameValue("");
  }

  function handleDeletePlace() {
    deleteLocation(locationId);
    router.push(`/v/${vaultId}`);
  }

  return (
    <>
      {/* ─── Desktop center pane ─── */}
      <div className="hidden h-full lg:block">
        <LocationDetailContent
          location={location}
          vaultId={vaultId}
          onAddPerson={handleAddPerson}
        />
      </div>

      {/* ─── Mobile layout ─── */}
      <div
        className="flex min-h-screen flex-col lg:hidden"
        style={{
          background: "var(--mr-bg)",
          paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Mobile header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--mr-edge)" }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
            aria-label="Back"
          >
            <ChevronLeft size={18} style={{ color: "var(--mr-dim)" }} />
          </button>
          {!isReadOnly && (
            <DropdownMenu
              items={[
                {
                  label: "Rename place",
                  onClick: () => {
                    setRenameValue(location.name);
                    setShowRenameModal(true);
                  },
                },
                {
                  label: "Delete place",
                  onClick: () => setShowDeleteConfirm(true),
                  destructive: true,
                },
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
          )}
        </div>

        {/* Location info */}
        <div className="px-5 pt-5 pb-4">
          <Eyebrow className="mb-2 block">Place</Eyebrow>
          <h1
            className="mb-1"
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "var(--mr-text)",
            }}
          >
            {location.name}
          </h1>
          {location.description && (
            <p className="text-[14px]" style={{ color: "var(--mr-dim)" }}>
              {location.description}
            </p>
          )}

          {/* Mobile search */}
          <div className="relative mt-4">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              style={{ color: "var(--mr-faint)" }}
            />
            <Input
              placeholder="Search people"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Group filter pills — horizontal scroll */}
          <div className="mt-3 flex gap-2 overflow-x-auto">
            <Chip active={activeGroupId === null} onClick={() => setActiveGroupId(null)}>
              All
            </Chip>
            {[...location.groups]
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
              .map((g) => (
                <div key={g.id} className="flex items-center gap-0.5">
                  <Chip active={activeGroupId === g.id} onClick={() => setActiveGroupId(g.id)}>
                    {g.name}
                  </Chip>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(g.id, g.name, g.people.length)}
                      className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
                      style={{ color: "var(--mr-faint)" }}
                      aria-label={`Delete group ${g.name}`}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* People sections */}
        <div className="flex flex-col gap-6 px-5">
          {!hasResults && hasSearch ? (
            <EmptyState heading="No matches" description="Try a different search" />
          ) : !hasResults ? (
            <EmptyState
              heading="No one here yet"
              description="Add the first person to start tracking regulars."
              action={!isReadOnly ? { label: "Add person", onClick: handleAddPerson } : undefined}
            />
          ) : (
            visibleGroups.map((group) => (
              <div key={group.id}>
                <Eyebrow className="mb-2 block">
                  {group.name} · {group.people.length}
                </Eyebrow>
                {group.people.length === 0 ? (
                  <div className="flex items-center gap-3 py-2">
                    <p className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
                      No people in this group
                    </p>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={handleAddPerson}
                        className="text-[13px] transition-opacity hover:opacity-50"
                        style={{ color: "var(--mr-accent)" }}
                      >
                        Add someone
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex flex-col overflow-hidden rounded-[14px] px-4"
                    style={{ background: "var(--mr-panel)", border: "1px solid var(--mr-edge)" }}
                  >
                    {group.people.map((person) => (
                      <PersonRow
                        key={person.id}
                        person={person}
                        isReadOnly={isReadOnly}
                        onClick={() => router.push(`/v/${vaultId}/l/${locationId}/p/${person.id}`)}
                        onLog={() => logVisit(locationId, group.id, person.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* FAB — mobile only */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddPerson}
            className="fixed flex items-center gap-2 text-[14px] font-[500] transition-all hover:brightness-110 active:opacity-70 dark:hover:brightness-90"
            style={{
              right: 22,
              bottom: 32,
              height: 54,
              borderRadius: 28,
              padding: "0 20px",
              background: "var(--mr-text)",
              color: "var(--mr-bg)",
              boxShadow: "0 14px 30px rgba(0,0,0,0.22)",
            }}
            aria-label="Add person"
          >
            <Plus size={18} />
            Add person
          </button>
        )}
      </div>

      {DialogComponent}

      {/* Rename Place Modal */}
      <Modal
        open={showRenameModal}
        onOpenChange={(open) => {
          setShowRenameModal(open);
          if (!open) setRenameValue("");
        }}
        title="Rename place"
      >
        <div className="flex flex-col gap-4 p-5">
          <Input
            placeholder="Place name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenamePlace()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRenamePlace} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Place Confirmation Modal */}
      <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Delete place">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
            This will permanently delete{" "}
            <strong style={{ color: "var(--mr-text)" }}>{location.name}</strong> and all its people.
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeletePlace}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
