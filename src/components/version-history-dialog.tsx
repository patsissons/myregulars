"use client";

import { useCallback, useEffect, useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { listDatastoreVersions } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useVault } from "@/lib/vault-context";
import { AppLink } from "@/components/app-link";
import { routes } from "@/lib/router/routes";
import type { DatastoreUri, VersionInfo } from "@/lib/datastore/types";

function VersionList({ versions, uri }: { versions: VersionInfo[]; uri: DatastoreUri }) {
  const { historicalVersionId } = useVault();

  return (
    <div className="flex flex-col gap-0">
      {versions.map((version, idx) => {
        const isLatest = idx === 0;
        const isViewing = version.id === historicalVersionId;

        return (
          <div
            key={version.id}
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: idx < versions.length - 1 ? "1px solid var(--mr-edge)" : undefined,
              background: isViewing ? "var(--mr-accent-soft)" : undefined,
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[13px] font-[500]"
                  style={{ color: "var(--mr-text)" }}
                >
                  {version.label}
                </span>
                {isLatest && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-[500]"
                    style={{
                      background: "var(--mr-accent-soft)",
                      color: "var(--mr-accent)",
                      border: "1px solid var(--mr-accent-soft-border)",
                    }}
                  >
                    Latest
                  </span>
                )}
                {isViewing && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-[500]"
                    style={{
                      background: "var(--mr-chip)",
                      color: "var(--mr-chip-text)",
                    }}
                  >
                    Viewing
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--mr-dim)" }}>
                {formatRelativeTime(version.createdAt)}
              </p>
            </div>
            {isLatest && historicalVersionId ? (
              <AppLink
                route={routes.vault(uri)}
                replace
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-[500] no-underline transition-all hover:brightness-[0.92] dark:hover:brightness-[1.1]"
                style={{
                  background: "var(--mr-subtle)",
                  border: "1px solid var(--mr-edge)",
                  color: "var(--mr-text)",
                }}
              >
                View latest
              </AppLink>
            ) : !isLatest && !isViewing ? (
              <AppLink
                route={routes.vault(uri, version.id)}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-[500] no-underline transition-all hover:brightness-[0.92] dark:hover:brightness-[1.1]"
                style={{
                  background: "var(--mr-subtle)",
                  border: "1px solid var(--mr-edge)",
                  color: "var(--mr-text)",
                }}
              >
                View
              </AppLink>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function VersionHistoryContent({ uri: routeUri }: { uri: DatastoreUri }) {
  const { uri } = useVault();
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;

    listDatastoreVersions(uri)
      .then((result) => {
        if (!cancelled) setVersions(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load versions.");
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[13px]" style={{ color: "var(--mr-danger)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!versions) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Loading versions…
        </span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          No version history available.
        </span>
      </div>
    );
  }

  return <VersionList versions={versions} uri={routeUri} />;
}

interface VersionHistoryDialogComponentProps {
  open: boolean;
  onClose: () => void;
  uri: DatastoreUri;
}

function VersionHistoryDialogComponent({ open, onClose, uri }: VersionHistoryDialogComponentProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Version history"
      historyId="version-history"
      cancelLabel="Done"
      width={480}
    >
      {open ? <VersionHistoryContent uri={uri} /> : null}
    </ResponsiveDialog>
  );
}

export function useVersionHistoryDialog(uri: DatastoreUri) {
  const [open, setOpen] = useState(false);

  const openVersionHistory = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const VersionHistoryDialogComponentRendered = (
    <VersionHistoryDialogComponent open={open} onClose={close} uri={uri} />
  );

  return {
    openVersionHistory,
    VersionHistoryDialogComponent: VersionHistoryDialogComponentRendered,
  };
}
