import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

interface LocationRowProps {
  location: {
    name: string;
    description?: string;
    peopleCount: number;
  };
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function LocationRow({ location, active, onClick, className }: LocationRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[7px] px-[7px] py-[7px] text-left transition-colors duration-100",
        "active:opacity-80",
        className,
      )}
      style={{
        background: active ? "var(--mr-accent-soft)" : "transparent",
        color: active ? "var(--mr-accent)" : "var(--mr-text)",
      }}
      aria-current={active ? "page" : undefined}
    >
      <MapPin
        size={14}
        style={{
          color: active ? "var(--mr-accent)" : "var(--mr-dim)",
          flexShrink: 0,
        }}
      />
      <span
        className="min-w-0 flex-1 truncate text-[13px] font-[450]"
        style={{ letterSpacing: "-0.01em" }}
      >
        {location.name}
      </span>
      <span
        className="flex-shrink-0 text-[11px]"
        style={{ color: active ? "var(--mr-accent)" : "var(--mr-faint)" }}
      >
        {location.peopleCount}
      </span>
    </button>
  );
}
