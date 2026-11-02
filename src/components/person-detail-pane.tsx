"use client";

import { Pencil, X } from "lucide-react";
import { useLogVisitDialog } from "@/components/log-visit-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useToast } from "@/components/ui/toast";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { getAllPeople, useVault } from "@/lib/vault-context";
import { navigate } from "@/lib/router/history";
import { routes } from "@/lib/router/routes";
import type { DatastoreUri, Group, Location, Person } from "@/lib/datastore/types";

interface PersonDetailPaneProps {
  person: Person;
  group: Group;
  location: Location;
  uri: DatastoreUri;
  version?: string;
  onClose: () => void;
  onEdit?: () => void;
}

export function PersonDetailPane({
  person,
  group,
  location,
  uri,
  version,
  onClose,
  onEdit,
}: PersonDetailPaneProps) {
  const { vault, isReadOnly, logVisit } = useVault();
  const { showToast } = useToast();

  const { openLogVisit, LogVisitDialogComponent } = useLogVisitDialog((day, note) => {
    logVisit(location.id, group.id, person.id, note, day);
    showToast("Visit logged");
  });

  const allPeople = getAllPeople(vault);

  function handleSawToday() {
    logVisit(location.id, group.id, person.id);
    showToast("Visit logged");
  }

  const recentVisits = (person.visitLog ?? []).slice(0, 10);

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ background: "var(--mr-bg)" }}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--mr-edge)" }}
      >
        <Eyebrow className="flex-1">Person</Eyebrow>
        {!isReadOnly && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="hover:bg-mr-subtle flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            aria-label="Edit person"
          >
            <Pencil size={14} style={{ color: "var(--mr-dim)" }} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-mr-subtle flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={16} style={{ color: "var(--mr-dim)" }} />
        </button>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center gap-2 px-5 pt-6 pb-4">
        <div style={{ animation: "mrPop 320ms cubic-bezier(.2,.9,.3,1.1) both" }}>
          <Avatar name={person.name} size={56} photoUrl={person.photoUrl} />
        </div>
        <div className="text-center">
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--mr-text)",
            }}
          >
            {person.name}
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--mr-dim)" }}>
            {group.name} · {location.name}
          </p>
          {person.lastSeen && (
            <p className="mt-1 text-[12px]" style={{ color: "var(--mr-faint)" }}>
              Last seen {formatLastSeen(person.lastSeen)}
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      {!isReadOnly && (
        <div className="flex gap-2 px-4 pb-4">
          <Button variant="primary" size="md" fullWidth onClick={handleSawToday}>
            Saw today
          </Button>
          <Button variant="secondary" size="md" onClick={openLogVisit}>
            Log…
          </Button>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-5 px-4 pb-6">
        {/* Notes */}
        <div>
          <Eyebrow className="mb-2 block">Notes</Eyebrow>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--mr-text)" }}>
            {person.detail || <span style={{ color: "var(--mr-faint)" }}>No notes yet.</span>}
          </p>
        </div>

        {/* Pets */}
        {person.pets && person.pets.length > 0 && (
          <div>
            <Eyebrow className="mb-2 block">Pets</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {person.pets.map((pet, idx) => (
                <Chip key={idx}>
                  {pet.name} ({pet.species})
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Recent visits */}
        <div>
          <Eyebrow className="mb-2 block">Recent visits</Eyebrow>
          {recentVisits.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
              No visits logged yet.
            </p>
          ) : (
            <div
              className="flex flex-col overflow-hidden rounded-[10px]"
              style={{ border: "1px solid var(--mr-edge)" }}
            >
              {recentVisits.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-baseline gap-3 px-3 py-2"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--mr-edge)" : undefined,
                  }}
                >
                  <span
                    className="shrink-0 font-mono text-[12px]"
                    style={{
                      color: "var(--mr-text)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {entry.date.slice(0, 10)}
                  </span>
                  {entry.note && (
                    <span className="min-w-0 text-[13px]" style={{ color: "var(--mr-dim)" }}>
                      {entry.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relationships */}
        {person.relationships && person.relationships.length > 0 && (
          <div>
            <Eyebrow className="mb-2 block">Relationships</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {person.relationships.map((rel) => {
                const related = allPeople.find((p) => p.person.id === rel.personId);
                if (!related) return null;
                return (
                  <Chip
                    key={rel.personId}
                    variant="accent"
                    onClick={() =>
                      navigate(routes.person(uri, related.location.id, related.person.id, version))
                    }
                  >
                    {related.person.name} · {rel.kind}
                  </Chip>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {LogVisitDialogComponent}
    </div>
  );
}
