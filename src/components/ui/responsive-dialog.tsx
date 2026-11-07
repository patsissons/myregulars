"use client";

import { Modal } from "@/components/ui/modal";
import { Sheet, type SheetAction } from "@/components/ui/sheet";
import { useHistorySheet } from "@/lib/router/use-route";
import { useIsMobile } from "@/lib/use-media";

export type { SheetAction as DialogAction };

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /**
   * Stable id for a history entry while open, so the system Back gesture
   * closes the dialog instead of leaving the screen. Omit for transient
   * confirmations that should not take part in history.
   */
  historyId?: string;
  /** Primary action for the mobile sheet header. Desktop keeps the body's own buttons. */
  action?: SheetAction;
  cancelLabel?: string;
  /**
   * Desktop-only action row (Cancel / Save buttons). On phones the sheet
   * header's Cancel and `action` take its place, so it is not rendered.
   */
  footer?: React.ReactNode;
  /** Desktop modal width. */
  width?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * A bottom sheet on phones (Cancel · Title · Action header, keyboard-aware)
 * and a centred modal on desktop. One component, one tree, chosen once by
 * viewport, so callers no longer branch on `useIsMobile` themselves.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  historyId,
  action,
  cancelLabel,
  footer,
  width,
  className,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  useHistorySheet(historyId, open, () => onOpenChange(false));

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        onCancel={() => onOpenChange(false)}
        cancelLabel={cancelLabel}
        action={action}
        className={className}
      >
        {children}
      </Sheet>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width={width}
      className={className}
    >
      {children}
      {footer}
    </Modal>
  );
}
