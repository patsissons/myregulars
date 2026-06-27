"use client";

import { useCallback, useMemo, useSyncExternalStore, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Sheet } from "@/components/ui/sheet";
import { createEmptyDocument } from "@/lib/datastore/schema";
import { useVault } from "@/lib/vault-context";

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

/**
 * Lightweight JSON syntax highlighter.
 * Returns an array of React elements with colored spans for keys, strings,
 * numbers, booleans, and null values.
 */
function highlightJson(json: string): React.ReactNode[] {
  // Regex to match JSON tokens: strings, numbers, booleans, null, and structural chars
  const tokenPattern =
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false|null)\b|([{}[\]:,])/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(json)) !== null) {
    // Add any whitespace/text between tokens
    if (match.index > lastIndex) {
      nodes.push(json.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Object key (string followed by colon)
      nodes.push(
        <span key={match.index} style={{ color: "var(--mr-json-key, #7c3aed)" }}>
          {match[1]}
        </span>,
      );
      // Emit only the colon — the whitespace JSON.stringify placed after it is
      // preserved as inter-token text on the next iteration, so re-adding a
      // space here would render a double space before the value.
      nodes.push(":");
    } else if (match[2] !== undefined) {
      // String value
      nodes.push(
        <span key={match.index} style={{ color: "var(--mr-json-string, #059669)" }}>
          {match[2]}
        </span>,
      );
    } else if (match[3] !== undefined) {
      // Number
      nodes.push(
        <span key={match.index} style={{ color: "var(--mr-json-number, #d97706)" }}>
          {match[3]}
        </span>,
      );
    } else if (match[4] !== undefined) {
      // Boolean / null
      nodes.push(
        <span key={match.index} style={{ color: "var(--mr-json-keyword, #dc2626)" }}>
          {match[4]}
        </span>,
      );
    } else if (match[5] !== undefined) {
      // Structural characters
      nodes.push(
        <span key={match.index} style={{ color: "var(--mr-dim)" }}>
          {match[5]}
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any trailing text
  if (lastIndex < json.length) {
    nodes.push(json.slice(lastIndex));
  }

  return nodes;
}

function VaultDataContent({ json }: { json: string }) {
  const highlighted = useMemo(() => highlightJson(json), [json]);

  return (
    <div className="p-4 pb-0">
      <pre
        className="overflow-auto rounded-xl p-4 font-mono text-[12px] leading-relaxed"
        style={{
          background: "var(--mr-subtle)",
          border: "1px solid var(--mr-edge)",
          color: "var(--mr-text)",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {highlighted}
      </pre>
    </div>
  );
}

function VaultDataFooter({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="shrink-0 p-4" style={{ borderTop: "1px solid var(--mr-edge)" }}>
      <Button variant="secondary" size="lg" fullWidth onClick={handleCopy}>
        {copied ? (
          <>
            <Check size={16} />
            Copied
          </>
        ) : (
          <>
            <Copy size={16} />
            Copy JSON
          </>
        )}
      </Button>
    </div>
  );
}

interface VaultDataDialogComponentProps {
  open: boolean;
  onClose: () => void;
}

function VaultDataDialogComponent({ open, onClose }: VaultDataDialogComponentProps) {
  const { vault } = useVault();
  const isMobile = useSyncExternalStore(subscribeToResize, getIsMobile, getIsMobileServer);

  const json = useMemo(() => {
    if (!vault) return "";
    const document = {
      ...createEmptyDocument(),
      name: vault.name,
      data: { locations: vault.locations },
    };
    return JSON.stringify(document, null, 2);
  }, [vault]);

  const content =
    open && json ? (
      <>
        <VaultDataContent json={json} />
        <div className="sticky bottom-0" style={{ background: "var(--mr-panel)" }}>
          <VaultDataFooter json={json} />
        </div>
      </>
    ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Vault data">
        {content}
      </Sheet>
    );
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Vault data" width={640}>
      {content}
    </Modal>
  );
}

export function useVaultDataDialog() {
  const [open, setOpen] = useState(false);

  const openVaultData = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const VaultDataDialogComponentRendered = <VaultDataDialogComponent open={open} onClose={close} />;

  return { openVaultData, VaultDataDialogComponent: VaultDataDialogComponentRendered };
}
