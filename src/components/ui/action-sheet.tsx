"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { LucideIcon } from "lucide-react";

export interface ActionSheetItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  icon?: LucideIcon;
  disabled?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context line above the actions (e.g. the item being acted on). */
  title?: string;
  items: ActionSheetItem[];
}

/**
 * The phone counterpart of a dropdown menu: a bottom sheet of full-width,
 * 52px actions with a separate Cancel. Items keep `menuitem` semantics so
 * tests and assistive tech see the same menu on both layouts.
 */
export function ActionSheet({ open, onOpenChange, title, items }: ActionSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100]"
          style={{ background: "var(--mr-overlay)", animation: "mrFadeIn 160ms ease-out both" }}
        />
        <Dialog.Content
          className="safe-x fixed right-0 bottom-0 left-0 z-[101] flex flex-col gap-2 px-3 outline-none"
          style={{
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
            animation: "mrSheetIn 240ms cubic-bezier(.2,.9,.3,1.05) both",
          }}
        >
          <Dialog.Title className="sr-only">{title ?? "Actions"}</Dialog.Title>
          <Dialog.Description />
          <div
            role="menu"
            className="overflow-hidden rounded-[16px]"
            style={{ background: "var(--mr-panel)", boxShadow: "var(--shadow-mr-pop)" }}
          >
            {title && (
              <div
                className="px-4 py-3 text-center text-[12px] font-medium"
                style={{ color: "var(--mr-dim)", borderBottom: "1px solid var(--mr-edge)" }}
              >
                {title}
              </div>
            )}
            {items.map(({ label, onClick, destructive, icon: Icon, disabled }, idx) => (
              <button
                key={label}
                role="menuitem"
                type="button"
                disabled={disabled}
                onClick={() => {
                  onOpenChange(false);
                  onClick();
                }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 px-4 text-[16px] transition-colors active:bg-black/[0.05] disabled:opacity-40 dark:active:bg-white/[0.07]"
                style={{
                  color: destructive ? "var(--mr-danger)" : "var(--mr-text)",
                  borderTop: idx > 0 || title ? "1px solid var(--mr-edge)" : undefined,
                }}
              >
                {Icon && <Icon size={18} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
          <Dialog.Close
            className="flex min-h-[52px] w-full items-center justify-center rounded-[16px] text-[16px] font-semibold active:opacity-70"
            style={{
              background: "var(--mr-panel)",
              color: "var(--mr-text)",
              boxShadow: "var(--shadow-mr-pop)",
            }}
          >
            Cancel
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
