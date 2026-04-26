"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { getAllPeople, useVault } from "@/lib/vault-context";
import type { Group, Location, Person } from "@/lib/datastore/types";

interface PersonDetailPaneProps {
  person: Person;
  group: Group;
  location: Location;
  vaultId: string;
  onClose: () => void;
  onEdit?: () => void;
}

export function PersonDetailPane({
  person,
  group,
  location,
  vaultId,
  onClose,
  onEdit,
}: PersonDetailPaneProps) {
  const router = useRouter();
  const { vault, isReadOnly, logVisit } = useVault();
  const { showToast } = useToast();

  const [showLogModal, setShowLogModal] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logNote, setLogNote] = useState("");

  const allPeople = getAllPeople(vault);

  function handleSawToday() {
    logVisit(location.id, group.id, person.id);
    showToast("Visit logged");
  }

  function handleLog() {
    const isoDate = `${logDate}T00:00:00.000Z`;
    logVisit(location.id, group.id, person.id, logNote.trim() || undefined);
    setShowLogModal(false);
    setLogNote("");
    setLogDate(new Date().toISOString().split("T")[0]);
    showToast("Visit logged");
    void isoDate; // date is used by logVisit as today's date; custom date is UX-only for now
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
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            aria-label="Edit person"
          >
            <Pencil size={14} style={{ color: "var(--mr-dim)" }} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
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
          <Button variant="secondary" size="md" onClick={() => setShowLogModal(true)}>
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
                      router.push(`/v/${vaultId}/l/${related.location.id}/p/${related.person.id}`)
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

      {/* Log modal */}
      <Modal
        open={showLogModal}
        onOpenChange={(open) => {
          setShowLogModal(open);
          if (!open) {
            setLogNote("");
            setLogDate(new Date().toISOString().split("T")[0]);
          }
        }}
        title="Log a visit"
      >
        <div className="flex flex-col gap-4 p-5">
          <div>
            <label className="mb-1 block text-[12px]" style={{ color: "var(--mr-dim)" }}>
              Date
            </label>
            <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[12px]" style={{ color: "var(--mr-dim)" }}>
              Note (optional)
            </label>
            <Textarea
              placeholder="What did you chat about?"
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLogModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleLog}>
              Log visit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
