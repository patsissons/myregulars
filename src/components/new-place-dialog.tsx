"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useOptionalToast } from "@/components/ui/toast";
import { useDuplicateConfirm } from "@/components/duplicate-confirm-dialog";
import { useVault } from "@/lib/vault-context";

const FORM_ID = "new-place-form";

interface NewPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NewPlaceDialog({ open, onOpenChange }: NewPlaceDialogProps) {
  const { vault, addLocation } = useVault();
  const toast = useOptionalToast();
  const { checkDuplicate, DuplicateConfirmDialogComponent } = useDuplicateConfirm();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setName("");
    setDescription("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const existingNames = vault?.locations.map((l) => l.name) ?? [];
    const confirmed = await checkDuplicate("place", trimmed, existingNames);
    if (!confirmed) return;
    addLocation(trimmed, description.trim() || undefined);
    toast?.showToast("Place added");
    handleOpenChange(false);
  }

  const canSave = name.trim().length > 0;

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="New place"
        historyId="new-place"
        action={{ label: "Add", form: FORM_ID, disabled: !canSave }}
        footer={
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" disabled={!canSave}>
              Add place
            </Button>
          </div>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div>
            <label
              htmlFor="new-place-name"
              className="mb-1 block text-[12px]"
              style={{ color: "var(--mr-dim)" }}
            >
              Place name
            </label>
            <Input
              id="new-place-name"
              placeholder="The Café Around the Corner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoCapitalize="words"
              autoComplete="off"
              enterKeyHint="next"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="new-place-description"
              className="mb-1 block text-[12px]"
              style={{ color: "var(--mr-dim)" }}
            >
              Description (optional)
            </label>
            <Input
              id="new-place-description"
              placeholder="Corner café, Tuesdays"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoCapitalize="sentences"
              enterKeyHint="done"
            />
          </div>
        </form>
      </ResponsiveDialog>
      {DuplicateConfirmDialogComponent}
    </>
  );
}

/** `use*Dialog` hook: an opener plus the element to render. */
export function useNewPlaceDialog() {
  const [open, setOpen] = useState(false);
  const openNewPlace = useCallback(() => setOpen(true), []);
  return {
    openNewPlace,
    NewPlaceDialogComponent: <NewPlaceDialog open={open} onOpenChange={setOpen} />,
  };
}
