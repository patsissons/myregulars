"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, children, className }: SheetProps) {
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
          className={cn("fixed right-0 bottom-0 left-0 z-[101] outline-none", className)}
          style={{
            background: "var(--mr-panel)",
            borderRadius: "20px 20px 0 0",
            maxHeight: "88vh",
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
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
