"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { localDateString } from "@/lib/datastore/helpers";

const FORM_ID = "log-visit-form";

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
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Log a visit"
      historyId="log-visit"
      action={{ label: "Log visit", form: FORM_ID }}
      footer={
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary">
            Log visit
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} className="flex flex-col gap-4 p-5" onSubmit={handleSubmit}>
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
            autoCapitalize="sentences"
            enterKeyHint="done"
          />
        </div>
      </form>
    </ResponsiveDialog>
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
