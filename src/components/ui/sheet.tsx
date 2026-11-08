"use client";

import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";

export interface SheetAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Submit this form id instead of calling onClick (keeps Enter-to-submit semantics). */
  form?: string;
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** With `onCancel` or `action`, the header becomes Cancel · Title · Action. */
  onCancel?: () => void;
  cancelLabel?: string;
  action?: SheetAction;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  onCancel,
  cancelLabel = "Cancel",
  action,
  children,
  className,
}: SheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // On iOS the keyboard overlays the sheet (position: fixed stays anchored
  // behind it). Lift the sheet above the keyboard and cap it to the visible
  // area so its body scrolls in view.
  const { inset, viewportHeight } = useKeyboardInset(open);
  const keyboardOpen = inset > 0;

  // Start the scroll container at the top when the sheet opens, so a focused
  // field near the top stays visible instead of the content jumping to the end.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const hasActionBar = Boolean(onCancel || action);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100]"
          style={{ background: "var(--mr-overlay)", animation: "mrFadeIn 200ms ease-out both" }}
        />
        <Dialog.Content
          className={cn("fixed right-0 left-0 z-[101] flex flex-col outline-none", className)}
          style={{
            background: "var(--mr-panel)",
            borderRadius: "20px 20px 0 0",
            boxShadow: "var(--shadow-mr-sheet)",
            // Sit on top of the keyboard (inset) rather than behind it, and cap
            // the height to the area above the keyboard when it's open.
            bottom: inset,
            maxHeight: keyboardOpen && viewportHeight ? `${viewportHeight}px` : "88dvh",
            animation: "mrSheetIn 280ms cubic-bezier(.2,.9,.3,1.1) both",
          }}
        >
          {/* Drag handle */}
          <div className="flex shrink-0 justify-center pt-3" aria-hidden="true">
            <div className="h-1 w-9 rounded-full" style={{ background: "var(--mr-edge-strong)" }} />
          </div>

          {hasActionBar ? (
            <div
              className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2 pt-1 pb-2"
              style={{ borderBottom: "1px solid var(--mr-edge)" }}
            >
              <div className="justify-self-start">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex h-11 items-center rounded-lg px-3 text-[15px] active:opacity-60"
                    style={{ color: "var(--mr-dim)" }}
                  >
                    {cancelLabel}
                  </button>
                )}
              </div>
              <Dialog.Title
                className="truncate px-2 text-center text-[16px] font-semibold"
                style={{ color: "var(--mr-text)", margin: 0 }}
              >
                {title}
              </Dialog.Title>
              <Dialog.Description className="hidden" />
              <div className="justify-self-end">
                {action && (
                  <button
                    type={action.form ? "submit" : "button"}
                    form={action.form}
                    onClick={action.form ? undefined : action.onClick}
                    disabled={action.disabled}
                    className="flex h-11 items-center rounded-lg px-3 text-[15px] font-semibold active:opacity-60 disabled:opacity-40"
                    style={{ color: "var(--mr-accent)" }}
                  >
                    {action.label}
                  </button>
                )}
              </div>
            </div>
          ) : (
            title && (
              <div className="shrink-0 px-5 pt-3">
                <Dialog.Title
                  className="text-[16px] font-semibold"
                  style={{ color: "var(--mr-text)", margin: 0 }}
                >
                  {title}
                </Dialog.Title>
                <Dialog.Description className="hidden" />
              </div>
            )
          )}

          <div
            ref={scrollRef}
            style={{
              overflowY: "auto",
              flex: 1,
              // Keep scrolling inside the sheet instead of chaining to the page.
              overscrollBehavior: "contain",
              paddingBottom: keyboardOpen ? 0 : "env(safe-area-inset-bottom)",
            }}
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
