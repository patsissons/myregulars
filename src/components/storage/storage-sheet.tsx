"use client";

import { useCallback, useEffect, useState } from "react";
import { ConflictSheet } from "@/components/storage/conflict-sheet";
import { DeleteCopyDialog } from "@/components/storage/delete-copy-dialog";
import {
  ReplicaCard,
  type ReplicaCardAction,
  type ReplicaCardStatus,
} from "@/components/storage/replica-card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useOptionalToast } from "@/components/ui/toast";
import type { DatastoreProviderId, DatastoreUri } from "@/lib/datastore/types";
import { getProviderFromUri } from "@/lib/datastore/uri";
import {
  copyDatastore,
  deleteDatastore,
  getReplicaStatus,
  resolveReplicaConflict,
  setPrimaryReplica,
  syncDatastoreReplicas,
  type ReplicaStatusResult,
} from "@/lib/db";
import { PROVIDER_LABELS, useEnsureSignedIn, useProviderAuth } from "@/lib/provider-auth";
import { navigate } from "@/lib/router/history";
import { routes } from "@/lib/router/routes";
import { useVault } from "@/lib/vault-context";

const PROVIDERS: DatastoreProviderId[] = ["gist", "hosted"];

interface StorageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uri: DatastoreUri;
}

type Busy = {
  kind: "copy" | "sync" | "resolve" | "delete" | "open";
  provider: DatastoreProviderId;
};

/**
 * Where this vault lives: one card per provider with copy / sync / resolve /
 * remove actions. Read-only viewers get "Copy to my …" instead.
 */
export function StorageSheet({ open, onOpenChange, uri }: StorageSheetProps) {
  const { vault, isReadOnly, dirty, cloneVault, openVault, flushPendingSave } = useVault();
  const toast = useOptionalToast();
  const gistAuth = useProviderAuth("gist");
  const hostedAuth = useProviderAuth("hosted");
  const { ensureSignedIn, SignInSheet } = useEnsureSignedIn();

  const [result, setResult] = useState<ReplicaStatusResult | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<Busy | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DatastoreProviderId | null>(null);

  const current = getProviderFromUri(uri);
  const authFor = { gist: gistAuth, hosted: hostedAuth } as const;

  const refresh = useCallback(async () => {
    try {
      const next = await getReplicaStatus(uri);
      setResult(next);
      setLoadError("");
    } catch (err) {
      setResult(null);
      setLoadError(err instanceof Error ? err.message : "Couldn't check the copies.");
    }
  }, [uri]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getReplicaStatus(uri)
      .then((next) => {
        if (cancelled) return;
        setResult(next);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult(null);
        setLoadError(err instanceof Error ? err.message : "Couldn't check the copies.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, uri]);

  function handleOpenChange(next: boolean) {
    // Forget the last reading on close so the next open starts from "Checking…".
    if (!next) setResult(null);
    onOpenChange(next);
  }

  function fail(err: unknown, fallback: string) {
    toast?.showToast(err instanceof Error ? err.message : fallback, { variant: "error" });
  }

  async function run(kind: Busy["kind"], provider: DatastoreProviderId, fn: () => Promise<void>) {
    setBusy({ kind, provider });
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyHere(provider: DatastoreProviderId) {
    if (!(await ensureSignedIn(provider))) return;
    await run("copy", provider, async () => {
      try {
        if (dirty) await flushPendingSave();
        if (isReadOnly) {
          if (provider === current) {
            const newUri = await cloneVault(`${vault?.name ?? "Vault"} — copy`);
            toast?.showToast(`Copied to your ${PROVIDER_LABELS[provider]}`);
            handleOpenChange(false);
            navigate(routes.vault(newUri), { replace: true });
            return;
          }
          const copied = await copyDatastore(uri, provider, { link: false });
          toast?.showToast(`Copied to ${PROVIDER_LABELS[provider]}`);
          handleOpenChange(false);
          navigate(routes.vault(copied.target.uri));
          return;
        }
        await copyDatastore(uri, provider);
        toast?.showToast(`Copied to ${PROVIDER_LABELS[provider]}. Saves now go to both.`);
        await openVault(uri);
        await refresh();
      } catch (err) {
        fail(err, "Couldn't copy the vault.");
      }
    });
  }

  async function handleSync(provider: DatastoreProviderId) {
    await run("sync", provider, async () => {
      try {
        if (dirty) await flushPendingSave();
        const outcome = await syncDatastoreReplicas(uri);
        if (outcome.applied) {
          toast?.showToast("Copies are in sync");
          await openVault(uri);
        }
        await refresh();
      } catch (err) {
        fail(err, "Couldn't update the copy.");
      }
    });
  }

  async function handleKeep(provider: DatastoreProviderId) {
    await run("resolve", provider, async () => {
      try {
        await resolveReplicaConflict(uri, provider);
        setConflictOpen(false);
        toast?.showToast(`Kept the ${PROVIDER_LABELS[provider]} copy`);
        await openVault(uri);
        await refresh();
      } catch (err) {
        fail(err, "Couldn't resolve the copies.");
      }
    });
  }

  async function handleDelete(provider: DatastoreProviderId) {
    const target = provider === current ? uri : result?.siblingUri;
    if (!target) return;
    const survivor = provider === current ? result?.siblingUri : uri;
    await run("delete", provider, async () => {
      try {
        await deleteDatastore(target);
        setDeleteTarget(null);
        toast?.showToast(survivor ? "Copy removed" : "Vault deleted");
        if (provider === current) {
          handleOpenChange(false);
          navigate(survivor ? routes.vault(survivor) : routes.vaults(), { replace: true });
          return;
        }
        await openVault(uri);
        await refresh();
      } catch (err) {
        fail(err, "Couldn't remove the copy.");
      }
    });
  }

  function handleOpenCopy(target: DatastoreUri) {
    setPrimaryReplica(target);
    handleOpenChange(false);
    navigate(routes.vault(target), { replace: true });
  }

  function cardFor(provider: DatastoreProviderId) {
    const auth = authFor[provider];
    const isCurrent = provider === current;
    const copy = result?.copies[provider] ?? null;
    const status = result?.status ?? null;
    const pendingHere = result?.entry?.pendingMirror === provider;

    let cardStatus: ReplicaCardStatus;
    if (!result && !loadError) cardStatus = "loading";
    else if (!copy) cardStatus = "missing";
    else if (!status) cardStatus = "current";
    else if (status.kind === "inSync") cardStatus = isCurrent ? "current" : "inSync";
    else if (status.kind === "diverged") cardStatus = "diverged";
    else if (status.to === provider) cardStatus = "behind";
    else cardStatus = "ahead";
    if (pendingHere && copy && cardStatus !== "diverged") cardStatus = "pendingMirror";

    const isBusy = busy?.provider === provider;
    let primaryAction: ReplicaCardAction | undefined;
    const secondaryActions: ReplicaCardAction[] = [];

    if (!copy && result) {
      if (auth.status !== "unconfigured") {
        primaryAction = {
          label: isReadOnly
            ? `Copy to my ${PROVIDER_LABELS[provider]}`
            : auth.status === "signedIn"
              ? "Copy here"
              : `Connect ${PROVIDER_LABELS[provider]}`,
          onClick: () => void handleCopyHere(provider),
        };
      }
    } else if (copy && isReadOnly) {
      if (isCurrent && auth.status !== "unconfigured") {
        primaryAction = {
          label: `Copy to my ${PROVIDER_LABELS[provider]}`,
          onClick: () => void handleCopyHere(provider),
        };
      }
    } else if (copy && status) {
      if (cardStatus === "diverged") {
        primaryAction = { label: "Resolve", onClick: () => setConflictOpen(true) };
      } else if (cardStatus === "behind" || cardStatus === "pendingMirror") {
        primaryAction = {
          label: cardStatus === "behind" ? "Update this copy" : "Retry",
          onClick: () => void handleSync(provider),
        };
      } else if (cardStatus === "ahead") {
        primaryAction = {
          label: "Update the other copy",
          onClick: () => void handleSync(provider),
        };
      }
      if (!isCurrent) {
        secondaryActions.push({ label: "Open this copy", onClick: () => handleOpenCopy(copy.uri) });
      }
      secondaryActions.push({
        label: "Remove this copy",
        variant: "danger",
        disabled: status.kind !== "inSync",
        onClick: () => setDeleteTarget(provider),
      });
    } else if (copy && !status && !isReadOnly) {
      secondaryActions.push({
        label: "Delete vault",
        variant: "danger",
        onClick: () => setDeleteTarget(provider),
      });
    }

    return (
      <ReplicaCard
        key={provider}
        provider={provider}
        auth={auth.status}
        username={auth.username}
        status={cardStatus}
        copy={copy}
        isCurrent={isCurrent}
        busy={isBusy}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
      />
    );
  }

  const visibleProviders = PROVIDERS.filter(
    (p) => p === current || authFor[p].status !== "unconfigured",
  );

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Storage"
        historyId="storage"
        cancelLabel="Done"
        width={520}
      >
        <div className="flex flex-col gap-3 p-5">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
            {isReadOnly
              ? "This vault belongs to someone else. Copy it to your own storage to edit it."
              : "Keep this vault in one place or both. With two copies every save goes to each, and you can drop either copy once they match."}
          </p>
          {loadError && (
            <p className="text-[13px]" style={{ color: "var(--mr-danger)" }}>
              {loadError}
            </p>
          )}
          {visibleProviders.map(cardFor)}
        </div>
      </ResponsiveDialog>

      {result && (
        <ConflictSheet
          open={conflictOpen}
          onOpenChange={setConflictOpen}
          copies={result.copies}
          current={current}
          busy={busy?.kind === "resolve" ? busy.provider : null}
          onKeep={(p) => void handleKeep(p)}
        />
      )}

      {deleteTarget && (
        <DeleteCopyDialog
          open
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          provider={deleteTarget}
          vaultName={vault?.name ?? "Vault"}
          lastCopy={!result?.siblingUri}
          busy={busy?.kind === "delete"}
          onConfirm={() => void handleDelete(deleteTarget)}
        />
      )}

      {SignInSheet}
    </>
  );
}

/** `use*Dialog` hook: an opener plus the element to render. */
export function useStorageSheet(uri: DatastoreUri) {
  const [open, setOpen] = useState(false);
  const openStorage = useCallback(() => setOpen(true), []);
  return {
    openStorage,
    StorageSheetComponent: <StorageSheet open={open} onOpenChange={setOpen} uri={uri} />,
  };
}
