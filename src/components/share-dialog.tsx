"use client";

import { useCallback, useState } from "react";
import { useIsMobile } from "@/lib/use-media";
import { Check, Copy, Eye } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { buildShareUrl, getGistIdFromUri } from "@/lib/datastore/uri";
import { useVault } from "@/lib/vault-context";

interface ShareContentProps {
  shareUrl: string;
  uri: string;
}

function ShareContent({ shareUrl, uri }: ShareContentProps) {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  const qrSize = isMobile ? 168 : 140;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      {/* QR code */}
      <div
        style={{
          background: "#ffffff",
          padding: 12,
          borderRadius: 12,
          display: "inline-block",
        }}
      >
        <QRCodeSVG value={shareUrl} size={qrSize} fgColor="#111111" bgColor="#ffffff" />
      </div>

      {/* Share URL pill */}
      <div
        className="w-full overflow-x-auto rounded-full px-4 py-2 text-center font-mono text-[12px]"
        style={{
          background: "var(--mr-subtle)",
          color: "var(--mr-dim)",
          whiteSpace: "nowrap",
        }}
      >
        {shareUrl}
      </div>

      {/* Copy link button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleCopy}
        style={
          copied
            ? {
                background: "var(--mr-success)",
                color: "#ffffff",
                border: "none",
              }
            : undefined
        }
      >
        {copied ? (
          <>
            <Check size={16} />
            Copied
          </>
        ) : (
          <>
            <Copy size={16} />
            Copy link
          </>
        )}
      </Button>

      {/* Info row */}
      <div className="flex items-start gap-2">
        <Eye size={14} style={{ color: "var(--mr-dim)", flexShrink: 0, marginTop: 2 }} />
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
          Recipients see a read-only copy. They can clone it to their own GitHub if they want to
          make edits.
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
  const { uri } = useVault();

  const shareUrl = uri && typeof window !== "undefined" ? buildShareUrl(getGistIdFromUri(uri)) : "";
  const uriStr = uri ?? "";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Share vault"
      historyId="share"
      cancelLabel="Done"
    >
      {open && shareUrl ? <ShareContent shareUrl={shareUrl} uri={uriStr} /> : null}
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
