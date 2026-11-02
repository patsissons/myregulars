"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface DuplicateConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  entityType: string;
  name: string;
}

function DuplicateConfirmDialog({
  open,
  onConfirm,
  onCancel,
  entityType,
  name,
}: DuplicateConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title={`Duplicate ${entityType} name`}
      action={{ label: "Create anyway", onClick: onConfirm }}
      footer={
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Create anyway
          </Button>
        </div>
      }
    >
      <p className="p-5 text-[14px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
        A {entityType} named <strong style={{ color: "var(--mr-text)" }}>{name}</strong> already
        exists. Do you want to create another with the same name?
      </p>
    </ResponsiveDialog>
  );
}

interface DuplicateCheckState {
  open: boolean;
  entityType: string;
  name: string;
}

export function useDuplicateConfirm() {
  const [state, setState] = useState<DuplicateCheckState>({
    open: false,
    entityType: "",
    name: "",
  });
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const checkDuplicate = useCallback(
    (entityType: string, name: string, existingNames: string[]): Promise<boolean> => {
      const normalizedName = name.trim().toLowerCase();
      const hasDuplicate = existingNames.some((n) => n.toLowerCase() === normalizedName);

      if (!hasDuplicate) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState({ open: true, entityType, name: name.trim() });
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState({ open: false, entityType: "", name: "" });
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState({ open: false, entityType: "", name: "" });
  }, []);

  const DuplicateConfirmDialogComponent = (
    <DuplicateConfirmDialog
      open={state.open}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      entityType={state.entityType}
      name={state.name}
    />
  );

  return { checkDuplicate, DuplicateConfirmDialogComponent };
}
