"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { PersonCard } from "@/components/ui/person-card";
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
          <div className="flex items-center justify-center py-16">
            <p className="text-[14px]" style={{ color: "var(--mr-faint)" }}>
              No matches for &ldquo;{search}&rdquo;
            </p>
          </div>
        ) : !hasResults ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-[14px]" style={{ color: "var(--mr-faint)" }}>
              No people here yet.
            </p>
            {!isReadOnly && (
              <Button variant="primary" size="md" onClick={onAddPerson}>
                <Plus size={14} />
                Add person
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {visibleGroups.map((group) => (
              <div key={group.id}>
                <div className="mb-3">
                  <Eyebrow>
                    {group.name} · {group.people.length}
                  </Eyebrow>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 10,
                  }}
                >
                  {group.people.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      active={person.id === activePersonId}
                      onClick={() => router.push(`/v/${vaultId}/l/${location.id}/p/${person.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
