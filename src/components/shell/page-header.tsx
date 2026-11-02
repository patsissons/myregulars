"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { goBack } from "@/lib/router/history";

interface PageHeaderProps {
  /** Compact title shown in the bar; screens usually also render a large heading below. */
  title?: string;
  /** Defaults to the router's hierarchical Back. Pass null to hide the button. */
  onBack?: (() => void) | null;
  backLabel?: string;
  /** Right-aligned controls: Share, sync chip, overflow menu. */
  right?: React.ReactNode;
  className?: string;
}

/**
 * The mobile top bar: sticky under the status bar with safe-area padding, a
 * 44px Back target on the left and actions on the right. Translucent so the
 * content scrolling under it reads as one surface.
 */
export function PageHeader({
  title,
  onBack = goBack,
  backLabel = "Back",
  right,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-40 shrink-0 backdrop-blur-md",
        "grid min-h-[52px] grid-cols-[auto_1fr_auto] items-center gap-1 px-2",
        className,
      )}
      style={{
        background: "color-mix(in srgb, var(--mr-bg) 86%, transparent)",
        borderBottom: "1px solid var(--mr-edge)",
      }}
    >
      <div className="flex items-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors active:bg-black/[0.07] dark:active:bg-white/[0.08]"
          >
            <ChevronLeft size={22} style={{ color: "var(--mr-text)" }} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="min-w-0 text-center">
        {title && (
          <span
            className="block truncate text-[15px] font-semibold"
            style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
          >
            {title}
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-0.5">{right}</div>
    </header>
  );
}
