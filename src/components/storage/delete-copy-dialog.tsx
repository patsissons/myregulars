"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { DatastoreProviderId } from "@/lib/datastore/types";
import { PROVIDER_LABELS } from "@/lib/provider-auth";

interface DeleteCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: DatastoreProviderId;
  vaultName: string;
  /** The only copy left: deleting it deletes the vault, so the name must be typed. */
  lastCopy: boolean;
  busy: boolean;
  onConfirm: () => void;
}

const FORM_ID = "delete-copy-form";

export function DeleteCopyDialog({
  open,
  onOpenChange,
  provider,
  vaultName,
  lastCopy,
  busy,
  onConfirm,
}: DeleteCopyDialogProps) {
  const [typed, setTyped] = useState("");
  const confirmed = !lastCopy || typed.trim() === vaultName.trim();
  const label = lastCopy ? "Delete vault" : "Remove copy";

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setTyped("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (confirmed && !busy) onConfirm();
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={lastCopy ? "Delete this vault?" : `Remove the ${PROVIDER_LABELS[provider]} copy?`}
      action={{ label: busy ? "Removing…" : label, form: FORM_ID, disabled: !confirmed || busy }}
      footer={
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="danger" disabled={!confirmed || busy}>
            {busy ? "Removing…" : label}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
          {lastCopy ? (
            <>
              This is the only copy of{" "}
              <strong style={{ color: "var(--mr-text)" }}>{vaultName}</strong>. Deleting it removes
              the vault and everyone in it permanently.
            </>
          ) : (
            <>
              The copy in {PROVIDER_LABELS[provider]} is in sync with your other copy, so nothing is
              lost. Future saves stop mirroring there.
            </>
          )}
        </p>
        {lastCopy && (
          <div>
            <label
              htmlFor="delete-copy-name"
              className="mb-1 block text-[12px]"
              style={{ color: "var(--mr-dim)" }}
            >
              Type the vault name to confirm
            </label>
            <Input
              id="delete-copy-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={vaultName}
              autoComplete="off"
              autoCapitalize="none"
              enterKeyHint="done"
            />
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
