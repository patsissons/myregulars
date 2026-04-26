"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  heading: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-[60px] text-center">
      {Icon && <Icon size={28} style={{ color: "var(--mr-faint)" }} />}
      <p className="text-[16px] font-[500]" style={{ color: "var(--mr-text)" }}>
        {heading}
      </p>
      {description && (
        <p className="max-w-[260px] text-[13px] leading-relaxed" style={{ color: "var(--mr-dim)" }}>
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
