"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { VaultCard, NewVaultCard, ImportVaultCard } from "@/components/vault-card";
import { useAuth } from "@/lib/auth-context";
import { VaultProvider, useVault } from "@/lib/vault-context";
import { discoverDatastores } from "@/lib/db";
import { addKnownVault, getKnownVaults, removeKnownVault } from "@/lib/known-vaults";
import { normalizeDatastoreUri, getGistIdFromUri } from "@/lib/datastore/uri";
import { parseDocumentString } from "@/lib/datastore/schema";
import type { DatastoreUri, MyRegularsDocument } from "@/lib/datastore/types";
import type { KnownVault } from "@/lib/vault-types";
import { useDuplicateConfirm } from "@/components/duplicate-confirm-dialog";

function VaultsContent() {
  const router = useRouter();
  const { username } = useAuth();
  const { createVault, importVault } = useVault();
  const { checkDuplicate, DuplicateConfirmDialogComponent } = useDuplicateConfirm();
  // Read from localStorage in lazy initializer (client-only component)
  const [vaults, setVaults] = useState<KnownVault[]>(() =>
    typeof localStorage !== "undefined" ? getKnownVaults() : [],
  );
  const [isDiscovering, setIsDiscovering] = useState(true);
  const [showNewVaultModal, setShowNewVaultModal] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importedDoc, setImportedDoc] = useState<MyRegularsDocument | null>(null);
  const [importName, setImportName] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [navigatingUri, setNavigatingUri] = useState<DatastoreUri | null>(null);
  const [, startNavigation] = useTransition();
  const importFileInputRef = useRef<HTMLInputElement>(null);

  function handleOpenVault(uri: DatastoreUri) {
    setNavigatingUri(uri);
    startNavigation(() => {
      router.push(`/v/${getGistIdFromUri(uri)}`);
    });
  }

  useEffect(() => {
    let cancelled = false;

    discoverDatastores()
      .then((discovered) => {
        if (cancelled) return;
        setVaults((prev) => {
          const knownUris = new Set(prev.map((v) => v.uri));
          const newVaults: KnownVault[] = [];

          for (const vault of discovered) {
            if (!knownUris.has(vault.uri)) {
              const newVault: KnownVault = {
                uri: vault.uri,
                name: vault.name ?? `Vault ${getGistIdFromUri(vault.uri).slice(0, 6)}`,
                lastOpened: vault.updatedAt,
                peopleCount: 0,
                locationCount: 0,
              };
              addKnownVault(newVault);
              newVaults.push(newVault);
            }
          }

          if (newVaults.length === 0) return prev;
          return [...prev, ...newVaults];
        });
      })
      .catch(() => {
        // Discovery is best-effort — don't block the page on failure
      })
      .finally(() => {
        if (!cancelled) setIsDiscovering(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleDeleteVault(uri: DatastoreUri) {
    removeKnownVault(uri);
    setVaults((prev) => prev.filter((v) => v.uri !== uri));
  }

  async function handleCreateVault() {
    if (!newVaultName.trim()) return;
    const existingNames = vaults.map((v) => v.name);
    const confirmed = await checkDuplicate("vault", newVaultName.trim(), existingNames);
    if (!confirmed) return;
    setIsCreating(true);
    try {
      const uri = await createVault(newVaultName.trim());
      const gistId = getGistIdFromUri(uri);
      setShowNewVaultModal(false);
      router.push(`/v/${gistId}`);
    } catch (err) {
      console.error("Failed to create vault:", err);
    } finally {
      setIsCreating(false);
    }
  }

  function resetImportState() {
    setImportJson("");
    setImportedDoc(null);
    setImportName("");
    setImportError("");
    setIsImporting(false);
  }

  function tryParseImport(value: string) {
    setImportJson(value);
    setImportError("");
    if (!value.trim()) {
      setImportedDoc(null);
      return;
    }
    try {
      const doc = parseDocumentString(value);
      setImportedDoc(doc);
      if (!importName.trim()) {
        setImportName(doc.name?.trim() ?? "");
      }
    } catch (err) {
      setImportedDoc(null);
      setImportError(err instanceof Error ? err.message : "Invalid vault JSON.");
    }
  }

  async function readFileIntoImport(file: File) {
    try {
      const text = await file.text();
      tryParseImport(text);
    } catch {
      setImportError("Could not read file.");
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await readFileIntoImport(file);
  }

  async function handleImportFileDrop(file: File) {
    setShowImportModal(true);
    await readFileIntoImport(file);
  }

  async function handleImportVault() {
    if (!importedDoc) return;
    const trimmedName = importName.trim();
    if (!trimmedName) {
      setImportError("Enter a vault name.");
      return;
    }
    const existingNames = vaults.map((v) => v.name);
    const confirmed = await checkDuplicate("vault", trimmedName, existingNames);
    if (!confirmed) return;
    setIsImporting(true);
    try {
      const uri = await importVault(trimmedName, importedDoc);
      const gistId = getGistIdFromUri(uri);
      setShowImportModal(false);
      resetImportState();
      router.push(`/v/${gistId}`);
    } catch (err) {
      console.error("Failed to import vault:", err);
      setImportError(err instanceof Error ? err.message : "Failed to import vault.");
      setIsImporting(false);
    }
  }

  function handleOpenByLink() {
    if (!linkInput.trim()) {
      setLinkError("Enter a vault link or gist ID.");
      return;
    }
    try {
      const uri = normalizeDatastoreUri(linkInput.trim());
      const gistId = getGistIdFromUri(uri);
      router.push(`/v/${gistId}`);
    } catch {
      setLinkError("Invalid vault link. Try a gist ID or share URL.");
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--mr-bg)", color: "var(--mr-text)" }}
    >
      <div className="mx-auto w-full max-w-[720px] px-5 py-8">
        {/* Header */}
        <div className="mb-2 flex items-center gap-3">
          <LogoMark size={32} />
        </div>
        {username && <Eyebrow className="mb-1 block">Signed in · github.com/{username}</Eyebrow>}
        <h1
          className="mb-6"
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "var(--mr-text)",
          }}
        >
          Your vaults
        </h1>

        {/* Vault grid */}
        <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
          {vaults.length === 0 && !isDiscovering && (
            <p className="col-span-full mb-4 text-[14px]" style={{ color: "var(--mr-dim)" }}>
              Welcome. Start your first notebook.
            </p>
          )}
          {isDiscovering && vaults.length === 0 && (
            <p className="col-span-full mb-4 text-[14px]" style={{ color: "var(--mr-dim)" }}>
              Looking for existing vaults…
            </p>
          )}
          {[...vaults]
            .sort((a, b) => (b.lastOpened ?? "").localeCompare(a.lastOpened ?? ""))
            .map((vault) => (
              <div key={vault.uri} className="relative flex flex-col">
                <VaultCard
                  vault={vault}
                  onClick={() => handleOpenVault(vault.uri)}
                  loading={navigatingUri === vault.uri}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteVault(vault.uri)}
                  className="absolute top-[14px] right-[14px] z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-black/[0.1] dark:hover:bg-white/[0.12]"
                  style={{
                    background: "var(--mr-subtle)",
                    border: "1px solid var(--mr-edge)",
                    color: "var(--mr-dim)",
                  }}
                  aria-label="Remove vault from list"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          <NewVaultCard onClick={() => setShowNewVaultModal(true)} />
          <ImportVaultCard
            onClick={() => setShowImportModal(true)}
            onFileDrop={handleImportFileDrop}
          />
        </div>

        {/* Open by link (mobile prominent, desktop secondary) */}
        <div className="mt-8">
          <Eyebrow className="mb-3 block">Or open by link</Eyebrow>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                placeholder="gist:abc123 or share URL"
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  setLinkError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleOpenByLink()}
              />
              {linkError && (
                <p className="mt-1 text-[12px]" style={{ color: "var(--mr-danger)" }}>
                  {linkError}
                </p>
              )}
            </div>
            <Button variant="primary" size="md" onClick={handleOpenByLink}>
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* New Vault Modal */}
      <Modal
        open={showNewVaultModal}
        onOpenChange={(open) => {
          setShowNewVaultModal(open);
          if (!open) setNewVaultName("");
        }}
        title="New vault"
      >
        <div className="flex flex-col gap-4 p-5">
          <Input
            placeholder="My regulars"
            value={newVaultName}
            onChange={(e) => setNewVaultName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isCreating && handleCreateVault()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNewVaultModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateVault}
              disabled={!newVaultName.trim() || isCreating}
            >
              {isCreating ? "Creating…" : "Create vault"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Vault Modal */}
      <Modal
        open={showImportModal}
        onOpenChange={(open) => {
          setShowImportModal(open);
          if (!open) resetImportState();
        }}
        title="Import vault"
        width={520}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2">
            <Eyebrow>Vault JSON</Eyebrow>
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => importFileInputRef.current?.click()}
              >
                Choose file…
              </Button>
              <span className="text-[12px]" style={{ color: "var(--mr-faint)" }}>
                or paste below
              </span>
            </div>
            <Textarea
              placeholder='{ "app": "myregulars", "schemaVersion": 1, ... }'
              value={importJson}
              onChange={(e) => tryParseImport(e.target.value)}
              rows={8}
              spellCheck={false}
              className="font-mono"
            />
            {importError && (
              <p className="text-[12px]" style={{ color: "var(--mr-danger)" }}>
                {importError}
              </p>
            )}
            {importedDoc && !importError && (
              <p className="text-[12px]" style={{ color: "var(--mr-dim)" }}>
                {importedDoc.data.locations.length} location
                {importedDoc.data.locations.length === 1 ? "" : "s"} ·{" "}
                {importedDoc.data.locations.reduce(
                  (sum, l) => sum + l.groups.reduce((s, g) => s + g.people.length, 0),
                  0,
                )}{" "}
                people
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Eyebrow>Vault name</Eyebrow>
            <Input
              placeholder="My regulars"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              disabled={!importedDoc}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                resetImportState();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImportVault}
              disabled={!importedDoc || !importName.trim() || isImporting}
            >
              {isImporting ? "Importing…" : "Import vault"}
            </Button>
          </div>
        </div>
      </Modal>

      {DuplicateConfirmDialogComponent}
    </div>
  );
}

export default function VaultsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--mr-bg)" }}
      >
        <div className="text-[13px]" style={{ color: "var(--mr-faint)" }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <VaultProvider>
      <VaultsContent />
    </VaultProvider>
  );
}
