"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Sheet } from "@/components/ui/sheet";
import { listDatastoreVersions } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useVault } from "@/lib/vault-context";
import type { VersionInfo } from "@/lib/datastore/types";

function subscribeToResize(cb: () => void): () => void {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
function getIsMobile(): boolean {
  return window.innerWidth < 1024;
}
function getIsMobileServer(): boolean {
  return false;
}

function VersionList({ versions, vaultId }: { versions: VersionInfo[]; vaultId: string }) {
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
              <a
                href={`/v/${vaultId}`}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-[500] no-underline transition-all hover:brightness-[0.92] dark:hover:brightness-[1.1]"
                style={{
                  background: "var(--mr-subtle)",
                  border: "1px solid var(--mr-edge)",
                  color: "var(--mr-text)",
                }}
              >
                View latest
              </a>
            ) : !isLatest && !isViewing ? (
              <a
                href={`/v/${vaultId}?version=${version.id}`}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-[500] no-underline transition-all hover:brightness-[0.92] dark:hover:brightness-[1.1]"
                style={{
                  background: "var(--mr-subtle)",
                  border: "1px solid var(--mr-edge)",
                  color: "var(--mr-text)",
                }}
              >
                View
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function VersionHistoryContent({ vaultId }: { vaultId: string }) {
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

  return <VersionList versions={versions} vaultId={vaultId} />;
}

interface VersionHistoryDialogComponentProps {
  open: boolean;
  onClose: () => void;
  vaultId: string;
}

function VersionHistoryDialogComponent({
  open,
  onClose,
  vaultId,
}: VersionHistoryDialogComponentProps) {
  const isMobile = useSyncExternalStore(subscribeToResize, getIsMobile, getIsMobileServer);

  const content = open ? <VersionHistoryContent vaultId={vaultId} /> : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Version history">
        {content}
      </Sheet>
    );
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Version history" width={480}>
      {content}
    </Modal>
  );
}

export function useVersionHistoryDialog(vaultId: string) {
  const [open, setOpen] = useState(false);

  const openVersionHistory = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const VersionHistoryDialogComponentRendered = (
    <VersionHistoryDialogComponent open={open} onClose={close} vaultId={vaultId} />
  );

  return {
    openVersionHistory,
    VersionHistoryDialogComponent: VersionHistoryDialogComponentRendered,
  };
}
