"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { localDateString } from "@/lib/datastore/helpers";

interface LogVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen local day (`YYYY-MM-DD`) and an optional note. */
  onLog: (day: string, note?: string) => void;
}

export function LogVisitDialog({ open, onOpenChange, onLog }: LogVisitDialogProps) {
  const [day, setDay] = useState(() => localDateString());
  const [note, setNote] = useState("");

  function reset() {
    setDay(localDateString());
    setNote("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!day) return;
    onLog(day, note.trim() || undefined);
    onOpenChange(false);
    reset();
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Log a visit">
      <form className="flex flex-col gap-4 p-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="log-visit-date"
            className="mb-1 block text-[12px]"
            style={{ color: "var(--mr-dim)" }}
          >
            Date
          </label>
          <Input
            id="log-visit-date"
            type="date"
            value={day}
            max={localDateString()}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="log-visit-note"
            className="mb-1 block text-[12px]"
            style={{ color: "var(--mr-dim)" }}
          >
            Note (optional)
          </label>
          <Textarea
            id="log-visit-note"
            placeholder="What did you chat about?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Log visit
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Hook following the `use*Dialog` pattern: returns an opener and the element
 * to render. `onLog` receives the local day and optional note.
 */
export function useLogVisitDialog(onLog: (day: string, note?: string) => void) {
  const [open, setOpen] = useState(false);

  return {
    openLogVisit: () => setOpen(true),
    LogVisitDialogComponent: <LogVisitDialog open={open} onOpenChange={setOpen} onLog={onLog} />,
  };
}
