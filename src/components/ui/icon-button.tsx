import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Accessible name; icon-only controls must always have one. */
  label: string;
  /** Icon size in px; the hit area stays 32px (44px on touch devices). */
  size?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 18, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-[120ms]",
        "text-mr-dim hover:bg-mr-subtle hover:text-mr-text active:scale-[0.97]",
        "focus-visible:ring-mr-accent focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        // Touch: a 44px square, pulled in with a negative margin so the row's
        // visual rhythm matches the 32px desktop box.
        "coarse:-m-1.5 coarse:h-11 coarse:w-11",
        className,
      )}
      {...props}
    >
      <Icon size={size} aria-hidden="true" />
    </button>
  );
});
