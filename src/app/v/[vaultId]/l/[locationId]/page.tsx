"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MoreHorizontal, Plus, Search } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { PersonRow } from "@/components/ui/person-row";
import { LocationDetailContent } from "@/components/location-detail-content";
import { usePersonFormDialog } from "@/components/person-form-dialog";
import { useVault } from "@/lib/vault-context";

export default function LocationPage({
  params,
}: {
  params: Promise<{ vaultId: string; locationId: string }>;
}) {
  const { vaultId, locationId } = use(params);
  const router = useRouter();
  const { vault, isReadOnly } = useVault();
  const { openAdd, DialogComponent } = usePersonFormDialog();

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
  const visibleGroups = location.groups
    .filter((g) => activeGroupId === null || g.id === activeGroupId)
    .map((g) => ({
      ...g,
      people: g.people.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.people.length > 0);

  const hasResults = visibleGroups.some((g) => g.people.length > 0);
  const hasSearch = search.length > 0;

  function handleAddPerson() {
    if (!location) return;
    openAdd(locationId, location);
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
        className="flex min-h-screen flex-col pb-24 lg:hidden"
        style={{ background: "var(--mr-bg)" }}
      >
        {/* Mobile header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--mr-edge)" }}
        >
          <button
            type="button"
            onClick={() => router.push(`/v/${vaultId}`)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            aria-label="Back"
          >
            <ChevronLeft size={18} style={{ color: "var(--mr-dim)" }} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            aria-label="More options"
          >
            <MoreHorizontal size={18} style={{ color: "var(--mr-dim)" }} />
          </button>
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
            {location.groups.map((g) => (
              <Chip
                key={g.id}
                active={activeGroupId === g.id}
                onClick={() => setActiveGroupId(g.id)}
              >
                {g.name}
              </Chip>
            ))}
          </div>
        </div>

        {/* People sections */}
        <div className="flex flex-col gap-6 px-5">
          {!hasResults && hasSearch ? (
            <p className="py-8 text-center text-[14px]" style={{ color: "var(--mr-faint)" }}>
              No matches for &ldquo;{search}&rdquo;
            </p>
          ) : !hasResults ? (
            <p className="py-8 text-center text-[14px]" style={{ color: "var(--mr-faint)" }}>
              No people here yet.
            </p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.id}>
                <Eyebrow className="mb-2 block">
                  {group.name} · {group.people.length}
                </Eyebrow>
                <div
                  className="flex flex-col overflow-hidden rounded-[14px] px-4"
                  style={{ background: "var(--mr-panel)", border: "1px solid var(--mr-edge)" }}
                >
                  {group.people.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      onClick={() => router.push(`/v/${vaultId}/l/${locationId}/p/${person.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FAB — mobile only */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddPerson}
            className="fixed flex items-center gap-2 text-[14px] font-[500] transition-opacity active:opacity-70"
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
    </>
  );
}
