"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/lib/use-media";

interface ReadOnlyBannerProps {
  onClone: () => void;
  /** Which provider owns the vault; only affects the wording. */
  provider?: "gist" | "hosted";
}

/**
 * Shown to viewers who cannot edit. One short line on phones so it does not
 * eat the screen; the full sentence on desktop.
 */
export function ReadOnlyBanner({ onClone, provider = "gist" }: ReadOnlyBannerProps) {
  const isMobile = useIsMobile();
  const owner = provider === "hosted" ? "this vault" : "this Gist";

  return (
    <div
      className="flex shrink-0 items-center gap-2 px-4 py-2"
      style={{
        background: "var(--mr-accent-soft)",
        borderBottom: "1px solid var(--mr-accent-soft-border)",
      }}
    >
      <Eye size={14} style={{ color: "var(--mr-accent)", flexShrink: 0 }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--mr-text)" }}>
        {isMobile
          ? "Read-only vault"
          : `Read-only vault — you don't own ${owner}. Clone it to make edits.`}
      </span>
      <Button
        variant="primary"
        size="sm"
        onClick={onClone}
        className="shrink-0"
        aria-label="Clone to your vault"
      >
        {isMobile ? "Clone" : "Clone to your vault"}
      </Button>
    </div>
  );
}
