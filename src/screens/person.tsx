"use client";

import { ChevronLeft } from "lucide-react";
import { PersonDetailPane } from "@/components/person-detail-pane";
import { LocationDetailContent } from "@/components/location-detail-content";
import { useLogVisitDialog } from "@/components/log-visit-dialog";
import { usePersonFormDialog } from "@/components/person-form-dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useToast } from "@/components/ui/toast";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { findPerson, useVault } from "@/lib/vault-context";
import { goBack, navigate } from "@/lib/router/history";
import { routes, type Route } from "@/lib/router/routes";
import { useIsMobile } from "@/lib/use-media";

interface PersonScreenProps {
  route: Extract<Route, { kind: "person" }>;
}

export function PersonScreen({ route }: PersonScreenProps) {
  const isMobile = useIsMobile();
  const { vault, isReadOnly, logVisit } = useVault();
  const { showToast } = useToast();
  const { openAdd, openEdit, DialogComponent } = usePersonFormDialog();
  const { uri, locationId, personId, version } = route;

  const result = findPerson(vault, locationId, personId);
  const location = vault?.locations.find((l) => l.id === locationId);

  // Hooks must run before the early return below; the dialog needs the ids
  // only when invoked, by which point `result` is guaranteed.
  const { openLogVisit, LogVisitDialogComponent } = useLogVisitDialog((day, note) => {
    if (!result) return;
    logVisit(locationId, result.group.id, personId, note, day);
    showToast("Visit logged");
  });

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

  function handleSawToday() {
    logVisit(location!.id, group.id, person.id);
    showToast("Visit logged");
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

  return (
    <>
      <div
        className="safe-x flex min-h-dvh flex-col"
        style={{ background: "var(--mr-bg)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Mobile header */}
        <div
          className="safe-top flex shrink-0 items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--mr-edge)" }}
        >
          <button
            type="button"
            onClick={goBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.07] dark:hover:bg-white/[0.08]"
            aria-label="Back"
          >
            <ChevronLeft size={18} style={{ color: "var(--mr-dim)" }} />
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleEdit}
              className="text-[14px] font-[500] transition-opacity hover:opacity-50"
              style={{ color: "var(--mr-accent)" }}
            >
              Edit
            </button>
          )}
        </div>

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
            {person.lastSeen && (
              <p className="mt-1 text-[12px]" style={{ color: "var(--mr-faint)" }}>
                Last seen {formatLastSeen(person.lastSeen)}
              </p>
            )}
          </div>

          {/* Action row */}
          {!isReadOnly && (
            <div className="mt-1 flex w-full gap-2">
              <Button variant="primary" size="lg" fullWidth onClick={handleSawToday}>
                Saw today
              </Button>
              <Button variant="secondary" size="lg" onClick={openLogVisit}>
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
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--mr-text)" }}>
              {person.detail || <span style={{ color: "var(--mr-faint)" }}>No notes yet.</span>}
            </p>
          </div>

          {/* Pets */}
          {person.pets && person.pets.length > 0 && (
            <div>
              <Eyebrow className="mb-2 block">Pets</Eyebrow>
              <p className="text-[13px]" style={{ color: "var(--mr-dim)" }}>
                {person.pets.map((pet) => `${pet.name} (${pet.species})`).join(", ")}
              </p>
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
                className="flex flex-col overflow-hidden rounded-[10px]"
                style={{ border: "1px solid var(--mr-edge)" }}
              >
                {person.visitLog.slice(0, 10).map((entry, idx) => (
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
        </div>
      </div>

      {DialogComponent}
      {LogVisitDialogComponent}
    </>
  );
}
