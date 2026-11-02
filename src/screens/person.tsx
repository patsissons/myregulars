"use client";

import { Check, Pencil } from "lucide-react";
import { PersonDetailPane } from "@/components/person-detail-pane";
import { LocationDetailContent } from "@/components/location-detail-content";
import { useLogVisitDialog } from "@/components/log-visit-dialog";
import { usePersonFormDialog } from "@/components/person-form-dialog";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useToast } from "@/components/ui/toast";
import { formatLastSeen, localDateString } from "@/lib/datastore/helpers";
import type { Person } from "@/lib/datastore/types";
import { findPerson, getAllPeople, useVault } from "@/lib/vault-context";
import { goBack, navigate } from "@/lib/router/history";
import { routes, type Route } from "@/lib/router/routes";
import { useIsMobile } from "@/lib/use-media";

interface PersonScreenProps {
  route: Extract<Route, { kind: "person" }>;
}

function loggedToday(person: Person): boolean {
  return person.lastSeen?.slice(0, 10) === localDateString();
}

export function PersonScreen({ route }: PersonScreenProps) {
  const isMobile = useIsMobile();
  const { vault, isReadOnly, logVisit, updatePerson } = useVault();
  const { showToast } = useToast();
  const { openAdd, openEdit, DialogComponent } = usePersonFormDialog();
  const { uri, locationId, personId, version } = route;

  const result = findPerson(vault, locationId, personId);
  const location = vault?.locations.find((l) => l.id === locationId);

  // Hooks must run before the early return below; the dialog needs the ids
  // only when invoked, by which point `result` is guaranteed.
  const { openLogVisit, LogVisitDialogComponent } = useLogVisitDialog((day, note) => {
    if (!result) return;
    logVisitWithUndo(result.group.id, result.person, note, day);
  });

  function logVisitWithUndo(groupId: string, person: Person, note?: string, day?: string) {
    const before = { lastSeen: person.lastSeen, visitLog: person.visitLog };
    logVisit(locationId, groupId, person.id, note, day);
    showToast("Visit logged", {
      action: {
        label: "Undo",
        onClick: () => updatePerson(locationId, groupId, person.id, before),
      },
    });
  }

  if (!result || !location) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-3"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Person not found.
        </span>
        <Button variant="secondary" size="sm" onClick={goBack}>
          Back
        </Button>
      </div>
    );
  }

  const { person, group } = result;

  function handleClose() {
    // Closing the rail replaces the entry so Back doesn't reopen the person.
    navigate(routes.location(uri, locationId, version), { replace: true, transition: "none" });
  }

  function handleEdit() {
    if (!location) return;
    openEdit(locationId, group.id, person, location);
  }

  if (!isMobile) {
    return (
      <>
        <div className="flex h-full">
          {/* Center: location detail */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <LocationDetailContent
              location={location}
              uri={uri}
              version={version}
              activePersonId={personId}
              onAddPerson={() => openAdd(locationId, location)}
            />
          </div>

          {/* Right rail */}
          <div
            className="w-[360px] shrink-0 overflow-hidden"
            style={{ borderLeft: "1px solid var(--mr-edge)" }}
          >
            <PersonDetailPane
              person={person}
              group={group}
              location={location}
              uri={uri}
              version={version}
              onClose={handleClose}
              onEdit={handleEdit}
            />
          </div>
        </div>
        {DialogComponent}
        {LogVisitDialogComponent}
      </>
    );
  }

  const isLoggedToday = loggedToday(person);
  const everyone = getAllPeople(vault);
  const relationships = (person.relationships ?? [])
    .map((rel) => {
      const match = everyone.find((entry) => entry.person.id === rel.personId);
      return match ? { ...rel, ...match } : null;
    })
    .filter((rel) => rel !== null);

  return (
    <>
      <div
        className="safe-x flex min-h-dvh flex-col"
        style={{ background: "var(--mr-bg)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <PageHeader
          onBack={goBack}
          title={location.name}
          right={
            !isReadOnly && (
              <Button variant="ghost" size="md" onClick={handleEdit} className="text-mr-accent">
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Button>
            )
          }
        />

        {/* Hero */}
        <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-5">
          <div style={{ animation: "mrPop 320ms cubic-bezier(.2,.9,.3,1.1) both" }}>
            <Avatar name={person.name} size={68} photoUrl={person.photoUrl} />
          </div>
          <div className="text-center">
            <h1
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "var(--mr-text)",
              }}
            >
              {person.name}
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "var(--mr-dim)" }}>
              {group.name} · {location.name}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--mr-faint)" }}>
              {person.lastSeen ? `Last seen ${formatLastSeen(person.lastSeen)}` : "Not seen yet"}
            </p>
          </div>

          {/* Action row */}
          {!isReadOnly && (
            <div className="mt-1 flex w-full gap-2">
              <Button
                variant={isLoggedToday ? "secondary" : "primary"}
                size="lg"
                fullWidth
                disabled={isLoggedToday}
                onClick={() => logVisitWithUndo(group.id, person)}
                className="min-h-[48px]"
              >
                {isLoggedToday ? (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Logged today
                  </>
                ) : (
                  "Saw today"
                )}
              </Button>
              <Button variant="secondary" size="lg" onClick={openLogVisit} className="min-h-[48px]">
                Log…
              </Button>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-5 px-5 pb-8">
          {/* Notes */}
          <div>
            <Eyebrow className="mb-2 block">Notes</Eyebrow>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--mr-text)" }}>
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
                    {pet.name} · {pet.species}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {relationships.length > 0 && (
            <div>
              <Eyebrow className="mb-2 block">Knows</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {relationships.map((rel) => (
                  <Chip
                    key={`${rel.kind}-${rel.personId}`}
                    variant="accent"
                    onClick={() =>
                      navigate(routes.person(uri, rel.location.id, rel.person.id, version))
                    }
                  >
                    {rel.person.name}
                    <span className="ml-1 opacity-70">· {rel.kind}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* Recent visits */}
          <div>
            <Eyebrow className="mb-2 block">Recent visits</Eyebrow>
            {!person.visitLog || person.visitLog.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
                No visits logged yet.
              </p>
            ) : (
              <div
                className="flex flex-col overflow-hidden rounded-[12px]"
                style={{ border: "1px solid var(--mr-edge)", background: "var(--mr-panel)" }}
              >
                {person.visitLog.slice(0, 10).map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-baseline gap-3 px-3 py-2.5"
                    style={{
                      borderTop: idx > 0 ? "1px solid var(--mr-edge)" : undefined,
                    }}
                  >
                    <span
                      className="w-[72px] shrink-0 text-[13px] font-medium"
                      style={{ color: "var(--mr-text)" }}
                    >
                      {formatLastSeen(entry.date)}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[11px]"
                      style={{ color: "var(--mr-faint)", fontVariantNumeric: "tabular-nums" }}
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
        </div>
      </div>

      {DialogComponent}
      {LogVisitDialogComponent}
    </>
  );
}
