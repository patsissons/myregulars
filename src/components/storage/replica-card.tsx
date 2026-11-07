"use client";

import { AlertCircle, Check, Loader2, RefreshCw, Server } from "lucide-react";
import { GitHubMark } from "@/components/icons/github-mark";
import { Button } from "@/components/ui/button";
import { formatLastSeen } from "@/lib/datastore/helpers";
import type { DatastoreProviderId } from "@/lib/datastore/types";
import { PROVIDER_LABELS, type ProviderAuthStatus } from "@/lib/provider-auth";

export type ReplicaCardStatus =
  | "loading"
  | "current"
  | "inSync"
  | "behind"
  | "ahead"
  | "diverged"
  | "pendingMirror"
  | "missing";

export interface ReplicaCardAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

interface ReplicaCardProps {
  provider: DatastoreProviderId;
  auth: ProviderAuthStatus;
  username: string | null;
  status: ReplicaCardStatus;
  /** Present when this provider holds a copy. */
  copy?: { updatedAt: string; peopleCount: number; locationCount: number } | null;
  isCurrent: boolean;
  busy?: boolean;
  primaryAction?: ReplicaCardAction;
  secondaryActions?: ReplicaCardAction[];
}

const STATUS_TEXT: Record<ReplicaCardStatus, string> = {
  loading: "Checking…",
  current: "Open now",
  inSync: "In sync",
  behind: "Behind the other copy",
  ahead: "Ahead of the other copy",
  diverged: "Has different changes",
  pendingMirror: "Last save not copied here yet",
  missing: "No copy here",
};

export function ReplicaCard({
  provider,
  auth,
  username,
  status,
  copy,
  isCurrent,
  busy = false,
  primaryAction,
  secondaryActions = [],
}: ReplicaCardProps) {
  const warn = status === "diverged" || status === "pendingMirror" || status === "behind";
  const Icon =
    status === "loading" || busy
      ? Loader2
      : status === "inSync" || status === "current"
        ? Check
        : warn
          ? status === "diverged"
            ? AlertCircle
            : RefreshCw
          : null;

  return (
    <section
      aria-label={`${PROVIDER_LABELS[provider]} copy`}
      data-provider={provider}
      data-status={status}
      className="flex flex-col gap-3 rounded-[14px] p-4"
      style={{
        background: "var(--mr-panel)",
        border: `1px solid ${isCurrent ? "var(--mr-accent-soft-border)" : "var(--mr-edge)"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: "var(--mr-subtle)", color: "var(--mr-text)" }}
          aria-hidden="true"
        >
          {provider === "gist" ? <GitHubMark size={18} /> : <Server size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold" style={{ color: "var(--mr-text)" }}>
              {PROVIDER_LABELS[provider]}
            </span>
            {isCurrent && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                style={{ background: "var(--mr-accent-soft)", color: "var(--mr-accent)" }}
              >
                Open
              </span>
            )}
          </div>
          <p className="truncate text-[12px]" style={{ color: "var(--mr-dim)" }}>
            {auth === "signedIn" && username
              ? username
              : auth === "signedIn"
                ? "Signed in"
                : auth === "signedOut"
                  ? "Not signed in"
                  : "Not configured"}
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 text-[13px]"
        style={{ color: warn ? "var(--mr-danger)" : "var(--mr-dim)" }}
      >
        {Icon && (
          <Icon
            size={14}
            aria-hidden="true"
            className={status === "loading" || busy ? "animate-spin" : undefined}
          />
        )}
        <span>{busy ? "Working…" : STATUS_TEXT[status]}</span>
        {copy && status !== "missing" && (
          <span style={{ color: "var(--mr-faint)" }}>
            · {copy.locationCount} place{copy.locationCount === 1 ? "" : "s"} · {copy.peopleCount}{" "}
            people · updated {formatLastSeen(copy.updatedAt)}
          </span>
        )}
      </div>

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {primaryAction && (
            <Button
              variant={primaryAction.variant ?? "primary"}
              size="md"
              disabled={busy || primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "secondary"}
              size="md"
              disabled={busy || action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
