"use client";

import { useCallback, useSyncExternalStore, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Sheet } from "@/components/ui/sheet";
import { PersonForm } from "@/components/person-form";
import type { Location, Person } from "@/lib/datastore/types";
import type { PersonFormConfig } from "@/components/person-form";

// External store for viewport width
function subscribeToResize(cb: () => void): () => void {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function getIsMobile(): boolean {
  return window.innerWidth < 1024;
}

function getIsMobileServer(): boolean {
  return false;
}

interface PersonFormDialogProps {
  config: PersonFormConfig | null;
  onClose: () => void;
}

function PersonFormDialog({ config, onClose }: PersonFormDialogProps) {
  const isMobile = useSyncExternalStore(subscribeToResize, getIsMobile, getIsMobileServer);
  const title = config?.mode === "add" ? "Add a person" : "Edit person";
  const open = !!config;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={title}>
        {config && <PersonForm config={config} onClose={onClose} />}
      </Sheet>
    );
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={title}>
      {config && <PersonForm config={config} onClose={onClose} />}
    </Modal>
  );
}

export function usePersonFormDialog() {
  const [config, setConfig] = useState<PersonFormConfig | null>(null);

  const openAdd = useCallback((locationId: string, location: Location, groupId?: string) => {
    setConfig({ mode: "add", locationId, location, groupId });
  }, []);

  const openEdit = useCallback(
    (locationId: string, groupId: string, person: Person, location: Location) => {
      setConfig({ mode: "edit", locationId, groupId, person, location });
    },
    [],
  );

  const close = useCallback(() => setConfig(null), []);

  const DialogComponent = <PersonFormDialog config={config} onClose={close} />;

  return { openAdd, openEdit, DialogComponent };
}
