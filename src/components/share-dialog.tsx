"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Eye, Link2, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useOptionalToast } from "@/components/ui/toast";
import { buildVaultShareUrl, getProviderFromUri } from "@/lib/datastore/uri";
import type { DatastoreUri } from "@/lib/datastore/types";
import { useVault } from "@/lib/vault-context";
import { useIsMobile } from "@/lib/use-media";

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

interface ShareContentProps {
  uri: DatastoreUri;
  vaultName: string;
}

function ShareContent({ uri, vaultName }: ShareContentProps) {
  const { isReadOnly, isPublic, setPublic } = useVault();
  const toast = useOptionalToast();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const provider = getProviderFromUri(uri);
  const hosted = provider === "hosted";
  const shareUrl = buildVaultShareUrl(uri);
  // Gists are always link-readable; hosted vaults need the switch on.
  const linkWorks = !hosted || isPublic === true;
  const canToggle = hosted && !isReadOnly;
  const qrSize = isMobile ? 168 : 140;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: vaultName,
        text: `${vaultName} on MyRegulars`,
        url: shareUrl,
      });
    } catch (err) {
      // The user dismissing the sheet rejects with AbortError; nothing to report.
      if (err instanceof DOMException && err.name === "AbortError") return;
      await handleCopy();
    }
  }

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    try {
      await setPublic(!isPublic);
    } catch (err) {
      toast?.showToast(err instanceof Error ? err.message : "Couldn't update link access.", {
        variant: "error",
      });
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      {canToggle && (
        <button
          type="button"
          role="switch"
          aria-checked={isPublic === true}
          disabled={toggling || isPublic === null}
          onClick={() => void handleToggle()}
          className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-colors active:opacity-80 disabled:opacity-60"
          style={{ background: "var(--mr-subtle)", border: "1px solid var(--mr-edge)" }}
        >
          <Link2 size={16} style={{ color: "var(--mr-dim)", flexShrink: 0 }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium" style={{ color: "var(--mr-text)" }}>
              Anyone with the link can view
            </span>
            <span className="block text-[12px]" style={{ color: "var(--mr-dim)" }}>
              {isPublic ? "Link access is on." : "Only you can open this vault."}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors"
            style={{ background: isPublic ? "var(--mr-accent)" : "var(--mr-edge-strong)" }}
          >
            <span
              className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left]"
              style={{ left: isPublic ? 23 : 3 }}
            />
          </span>
        </button>
      )}

      {/* QR code */}
      <div
        className="inline-block rounded-[12px] p-3 transition-opacity"
        style={{ background: "#ffffff", opacity: linkWorks ? 1 : 0.35 }}
        aria-hidden={!linkWorks}
      >
        <QRCodeSVG value={shareUrl} size={qrSize} fgColor="#111111" bgColor="#ffffff" />
      </div>

      {/* Share URL pill */}
      <div
        className="w-full overflow-x-auto rounded-full px-4 py-2 text-center font-mono text-[12px] whitespace-nowrap"
        style={{ background: "var(--mr-subtle)", color: "var(--mr-dim)" }}
      >
        {shareUrl}
      </div>

      <div className="flex w-full flex-col gap-2">
        {canNativeShare() && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!linkWorks}
            onClick={() => void handleNativeShare()}
            className="min-h-[48px]"
          >
            <Share2 size={16} aria-hidden="true" />
            Share…
          </Button>
        )}
        <Button
          variant={canNativeShare() ? "secondary" : "primary"}
          size="lg"
          fullWidth
          disabled={!linkWorks}
          onClick={() => void handleCopy()}
          className="min-h-[48px]"
          style={
            copied
              ? { background: "var(--mr-success)", color: "#fff", borderColor: "transparent" }
              : undefined
          }
        >
          {copied ? (
            <>
              <Check size={16} aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy size={16} aria-hidden="true" />
              Copy link
            </>
          )}
        </Button>
      </div>

      {/* Info row */}
      <div className="flex items-start gap-2">
        <Eye size={14} style={{ color: "var(--mr-dim)", flexShrink: 0, marginTop: 2 }} />
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
          {linkWorks
            ? hosted
              ? "Recipients see a read-only copy. They can copy it to their own storage to make edits."
              : "Recipients see a read-only copy. They can clone it to their own GitHub if they want to make edits."
            : "Turn on link access above to share this vault."}
        </p>
      </div>

      {/* URI footer */}
      <p className="font-mono text-[11px]" style={{ color: "var(--mr-faint)" }}>
        {uri}
      </p>
    </div>
  );
}

interface ShareDialogComponentProps {
  open: boolean;
  onClose: () => void;
}

function ShareDialogComponent({ open, onClose }: ShareDialogComponentProps) {
  const { uri, vault } = useVault();

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Share vault"
      historyId="share"
      cancelLabel="Done"
    >
      {open && uri ? <ShareContent uri={uri} vaultName={vault?.name ?? "Vault"} /> : null}
    </ResponsiveDialog>
  );
}

export function useShareDialog() {
  const [open, setOpen] = useState(false);

  const openShare = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const ShareDialogComponentRendered = <ShareDialogComponent open={open} onClose={close} />;

  return { openShare, ShareDialogComponent: ShareDialogComponentRendered };
}
