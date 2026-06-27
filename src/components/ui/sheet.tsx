"use client";

import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, children, className }: SheetProps) {
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--mr-overlay)",
            zIndex: 100,
            animation: "mrFadeIn 200ms ease-out both",
          }}
        />
        <Dialog.Content
          className={cn("fixed right-0 left-0 z-[101] outline-none", className)}
          style={{
            background: "var(--mr-panel)",
            borderRadius: "20px 20px 0 0",
            // Sit on top of the keyboard (inset) rather than behind it, and cap
            // the height to the area above the keyboard when it's open.
            bottom: inset,
            maxHeight: keyboardOpen && viewportHeight ? `${viewportHeight}px` : "88dvh",
            display: "flex",
            flexDirection: "column",
            animation: "mrSheetIn 280ms cubic-bezier(.2,.9,.3,1.1) both",
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "12px 0 0",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: "var(--mr-edge-strong)",
              }}
            />
          </div>
          {title && (
            <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
              <Dialog.Title
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--mr-text)",
                  margin: 0,
                }}
              >
                {title}
              </Dialog.Title>
              <Dialog.Description />
            </div>
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
