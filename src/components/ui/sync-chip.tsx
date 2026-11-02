"use client";

import { AlertCircle, Check, CloudOff, HardDrive, History, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useVault } from "@/lib/vault-context";
import { useOnline } from "@/lib/use-media";

export type SyncStatus =
  | "saving"
  | "saved"
  | "failed"
  | "cached"
  | "offline"
  | "viewing"
  | "mirrorPending"
  | "diverged";

export interface SyncInputs {
  isHistoricalVersion: boolean;
  isSyncing: boolean;
  dirty: boolean;
  error: string | null;
  source: "cache" | "remote" | null;
  online: boolean;
}

/** Pure mapping from store state to the chip's status, in priority order. */
export function deriveSyncStatus(s: SyncInputs): SyncStatus {
  if (s.isHistoricalVersion) return "viewing";
  if (s.dirty && s.error) return "failed";
  if (!s.online) return "offline";
  if (s.isSyncing || s.dirty) return "saving";
  if (s.source === "cache") return "cached";
  return "saved";
}

const LABELS: Record<
  SyncStatus,
  { text: string; icon: typeof Check; tone: "ok" | "warn" | "mute" }
> = {
  saving: { text: "Saving…", icon: Loader2, tone: "mute" },
  saved: { text: "Saved", icon: Check, tone: "mute" },
  failed: { text: "Not saved", icon: AlertCircle, tone: "warn" },
  cached: { text: "Cached copy", icon: HardDrive, tone: "mute" },
  offline: { text: "Offline", icon: CloudOff, tone: "warn" },
  viewing: { text: "Viewing history", icon: History, tone: "ok" },
  mirrorPending: { text: "Copy behind", icon: RefreshCw, tone: "warn" },
  diverged: { text: "Copies differ", icon: AlertCircle, tone: "warn" },
};

interface SyncChipProps {
  /** Overrides the derived status (Phase 5 feeds mirror states from the registry). */
  status?: SyncStatus;
  className?: string;
  /** Icon only; the label becomes the accessible name. */
  compact?: boolean;
}

/**
 * One glanceable word for "is my data safe": derived from the vault store,
 * tappable to retry when a save failed.
 */
export function SyncChip({ status: override, className, compact = false }: SyncChipProps) {
  const { isHistoricalVersion, isSyncing, dirty, error, source, retrySave } = useVault();
  const online = useOnline();
  const status =
    override ?? deriveSyncStatus({ isHistoricalVersion, isSyncing, dirty, error, source, online });
  const { text, icon: Icon, tone } = LABELS[status];
  const retryable = status === "failed";
  const label = retryable ? `${text} · Retry` : text;

  const color =
    tone === "warn" ? "var(--mr-danger)" : tone === "ok" ? "var(--mr-accent)" : "var(--mr-faint)";

  const content = (
    <>
      <Icon
        size={compact ? 14 : 12}
        aria-hidden="true"
        className={cn("shrink-0", status === "saving" && "animate-spin")}
      />
      {!compact && <span className="truncate">{label}</span>}
    </>
  );

  const classes = cn(
    "inline-flex max-w-full items-center gap-1 rounded-full text-[11px] font-medium whitespace-nowrap",
    compact ? "touch-target h-7 w-7 justify-center" : "h-6 px-2",
    retryable && "border",
    className,
  );

  if (retryable) {
    return (
      <button
        type="button"
        onClick={() => void retrySave()}
        aria-label={label}
        title={label}
        data-status={status}
        className={cn(classes, "active:opacity-70")}
        style={{ color, borderColor: "var(--mr-danger)", background: "transparent" }}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      data-status={status}
      className={classes}
      style={{ color }}
    >
      {content}
    </span>
  );
}
