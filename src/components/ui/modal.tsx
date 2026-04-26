"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
  className?: string;
}

export function Modal({ open, onOpenChange, title, children, width = 480, className }: ModalProps) {
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
          className={cn(
            "fixed top-1/2 left-1/2 z-[101] -translate-x-1/2 -translate-y-1/2",
            className,
          )}
          style={{
            width,
            maxWidth: "calc(100vw - 32px)",
            background: "var(--mr-panel)",
            borderRadius: 16,
            boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
            animation: "mrFadeIn 250ms ease-out both",
            outline: "none",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {title && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px 0",
                flexShrink: 0,
              }}
            >
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
              <Dialog.Close
                aria-label="Close"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--mr-dim)",
                }}
              >
                <X size={16} />
              </Dialog.Close>
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
