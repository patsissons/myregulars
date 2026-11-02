"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { formatLastSeen } from "@/lib/datastore/helpers";
import type { DatastoreProviderId } from "@/lib/datastore/types";
import type { ReplicaCopyInfo } from "@/lib/db";
import { PROVIDER_LABELS } from "@/lib/provider-auth";

interface ConflictSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copies: Partial<Record<DatastoreProviderId, ReplicaCopyInfo>>;
  current: DatastoreProviderId;
  busy: DatastoreProviderId | null;
  onKeep: (provider: DatastoreProviderId) => void;
}

/**
 * Both copies changed since they last agreed. There is no merge: the user
 * picks the copy to keep and the other is overwritten with it.
 */
export function ConflictSheet({
  open,
  onOpenChange,
  copies,
  current,
  busy,
  onKeep,
}: ConflictSheetProps) {
  const providers = (["gist", "hosted"] as const).filter((p) => copies[p]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Copies differ"
      historyId="resolve-copies"
    >
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
          Both copies were edited since they last matched. Choose the one to keep; the other copy
          will be replaced with it. Changes made only in the copy you drop are lost.
        </p>
        <div className="flex flex-col gap-2">
          {providers.map((provider) => {
            const copy = copies[provider]!;
            return (
              <div
                key={provider}
                className="flex items-center gap-3 rounded-[14px] p-4"
                style={{ background: "var(--mr-subtle)", border: "1px solid var(--mr-edge)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold" style={{ color: "var(--mr-text)" }}>
                    {PROVIDER_LABELS[provider]}
                    {provider === current && (
                      <span
                        className="ml-2 text-[11px] font-medium"
                        style={{ color: "var(--mr-accent)" }}
                      >
                        open now
                      </span>
                    )}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--mr-dim)" }}>
                    {copy.locationCount} place{copy.locationCount === 1 ? "" : "s"} ·{" "}
                    {copy.peopleCount} people · updated {formatLastSeen(copy.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  disabled={busy !== null}
                  onClick={() => onKeep(provider)}
                >
                  {busy === provider ? "Keeping…" : "Keep this"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
