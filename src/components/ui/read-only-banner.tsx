import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadOnlyBannerProps {
  onClone: () => void;
}

export function ReadOnlyBanner({ onClone }: ReadOnlyBannerProps) {
  return (
    <div
      style={{
        background: "var(--mr-accent-soft)",
        borderBottom: "1px solid var(--mr-accent-soft-border)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <Eye size={14} style={{ color: "var(--mr-accent)", flexShrink: 0 }} />
      <span className="min-w-0 flex-1 text-[13px]" style={{ color: "var(--mr-text)" }}>
        Read-only vault — you don&apos;t own this Gist. Clone it to make edits.
      </span>
      <Button variant="primary" size="sm" onClick={onClone} className="flex-shrink-0">
        Clone to your vault
      </Button>
    </div>
  );
}
