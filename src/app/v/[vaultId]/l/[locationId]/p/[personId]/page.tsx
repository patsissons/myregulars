"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PersonDetailPane } from "@/components/person-detail-pane";
import { LocationDetailContent } from "@/components/location-detail-content";
import { usePersonFormDialog } from "@/components/person-form-dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { findPerson, useVault } from "@/lib/vault-context";

export default function PersonPage({
  params,
}: {
  params: Promise<{ vaultId: string; locationId: string; personId: string }>;
}) {
  const { vaultId, locationId, personId } = use(params);
  const router = useRouter();
  const { vault, isReadOnly, logVisit } = useVault();
  const { openAdd, openEdit, DialogComponent } = usePersonFormDialog();

  const result = findPerson(vault, locationId, personId);
  const location = vault?.locations.find((l) => l.id === locationId);

  if (!result || !location) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Person not found.
        </span>
      </div>
    );
  }

  const { person, group } = result;

  function handleClose() {
    router.push(`/v/${vaultId}/l/${locationId}`);
  }

  function handleEdit() {
    if (!location) return;
    openEdit(locationId, group.id, person, location);
  }

  return (
    <>
      {/* ─── Desktop: location center + person right rail ─── */}
      <div className="hidden h-full lg:flex">
        {/* Center: location detail */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <LocationDetailContent
            location={location}
            vaultId={vaultId}
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
            vaultId={vaultId}
            onClose={handleClose}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {/* ─── Mobile: full-screen person detail ─── */}
      <div className="flex min-h-screen flex-col lg:hidden" style={{ background: "var(--mr-bg)" }}>
        {/* Mobile header */}
        <div
          className="flex shrink-0 items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--mr-edge)" }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            aria-label="Back"
          >
            <ChevronLeft size={18} style={{ color: "var(--mr-dim)" }} />
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleEdit}
              className="text-[14px] font-[500] transition-opacity hover:opacity-70"
              style={{ color: "var(--mr-accent)" }}
            >
              Edit
            </button>
          )}
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-5">
          <Avatar name={person.name} size={68} photoUrl={person.photoUrl} />
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
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  logVisit(location.id, group.id, person.id);
                }}
              >
                Saw today
              </Button>
              <Button variant="secondary" size="lg">
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
    </>
  );
}
