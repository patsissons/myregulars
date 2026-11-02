"use client";

import { useCallback, useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { PersonForm, PERSON_FORM_ID } from "@/components/person-form";
import type { Location, Person } from "@/lib/datastore/types";
import type { PersonFormConfig } from "@/components/person-form";
import { useIsMobile } from "@/lib/use-media";

interface PersonFormDialogProps {
  config: PersonFormConfig | null;
  onClose: () => void;
}

function PersonFormDialog({ config, onClose }: PersonFormDialogProps) {
  const isMobile = useIsMobile();
  const isAdd = config?.mode === "add";
  const open = !!config;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isAdd ? "Add a person" : "Edit person"}
      historyId="person-form"
      action={{ label: isAdd ? "Add" : "Save", form: PERSON_FORM_ID }}
    >
      {config && (
        <PersonForm config={config} onClose={onClose} layout={isMobile ? "sheet" : "modal"} />
      )}
    </ResponsiveDialog>
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
