"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { PersonCard } from "@/components/ui/person-card";
import { EmptyState } from "@/components/empty-state";
import { AnimatedList, AnimatedItem } from "@/components/animated-list";
import { useVault } from "@/lib/vault-context";
import type { Location } from "@/lib/datastore/types";

interface LocationDetailContentProps {
  location: Location;
  vaultId: string;
  activePersonId?: string | null;
  onAddPerson?: () => void;
}

export function LocationDetailContent({
  location,
  vaultId,
  activePersonId,
  onAddPerson,
}: LocationDetailContentProps) {
  const router = useRouter();
  const { isReadOnly } = useVault();

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const totalPeople = location.groups.flatMap((g) => g.people).length;

  const hasSearch = search.length > 0;

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
    // When searching, hide groups with no matches; otherwise show all groups
    .filter((g) => !hasSearch || g.people.length > 0);

  const hasResults = visibleGroups.some((g) => g.people.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="shrink-0 px-8 pt-[22px] pb-0"
        style={{ borderBottom: "1px solid var(--mr-edge)" }}
      >
        <div className="mb-3 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-1 block">Place</Eyebrow>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "var(--mr-text)",
                lineHeight: 1.1,
              }}
            >
              {location.name}
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "var(--mr-dim)" }}>
              {location.description ? `${location.description} · ` : ""}
              {totalPeople} {totalPeople === 1 ? "person" : "people"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-1">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                style={{ color: "var(--mr-faint)" }}
              />
              <Input
                placeholder="Search people"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[220px] pl-[30px]"
              />
            </div>
            {!isReadOnly && (
              <Button variant="primary" size="md" onClick={onAddPerson}>
                <Plus size={14} />
                Add person
              </Button>
            )}
          </div>
        </div>

        {/* Group filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3">
          <Chip active={activeGroupId === null} onClick={() => setActiveGroupId(null)}>
            All
          </Chip>
          {location.groups.map((g) => (
            <Chip key={g.id} active={activeGroupId === g.id} onClick={() => setActiveGroupId(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* People grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {!hasResults && hasSearch ? (
          <EmptyState heading="No matches" description={`Try a different search`} />
        ) : !hasResults ? (
          <EmptyState
            heading="No one here yet"
            description="Add the first person to start tracking regulars at this spot."
            action={
              !isReadOnly ? { label: "Add person", onClick: onAddPerson ?? (() => {}) } : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {visibleGroups.map((group) => (
              <div key={group.id}>
                <div className="mb-3">
                  <Eyebrow>
                    {group.name} · {group.people.length}
                  </Eyebrow>
                </div>
                {group.people.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <p className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
                      No people in this group
                    </p>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={onAddPerson}
                        className="text-[13px] transition-opacity hover:opacity-70"
                        style={{ color: "var(--mr-accent)" }}
                      >
                        Add someone
                      </button>
                    )}
                  </div>
                ) : (
                  <AnimatedList
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {group.people.map((person) => (
                      <AnimatedItem key={person.id}>
                        <PersonCard
                          person={person}
                          active={person.id === activePersonId}
                          onClick={() =>
                            router.push(`/v/${vaultId}/l/${location.id}/p/${person.id}`)
                          }
                        />
                      </AnimatedItem>
                    ))}
                  </AnimatedList>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
