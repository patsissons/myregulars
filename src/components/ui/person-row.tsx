import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { cn } from "@/lib/cn";

interface PersonRowProps {
  person: {
    id: string;
    name: string;
    detail: string;
    lastSeen?: string;
    photoUrl?: string;
  };
  onClick?: () => void;
  className?: string;
}

export function PersonRow({ person, onClick, className }: PersonRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-0 py-[10px] text-left transition-colors duration-100",
        "border-b last:border-b-0 active:opacity-70",
        className,
      )}
      style={{ borderColor: "var(--mr-edge)" }}
    >
      <Avatar name={person.name} size={36} photoUrl={person.photoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="truncate text-[14px] font-[500]"
            style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
          >
            {person.name}
          </span>
          {person.lastSeen && (
            <span className="flex-shrink-0 text-[11px]" style={{ color: "var(--mr-faint)" }}>
              {formatLastSeen(person.lastSeen)}
            </span>
          )}
        </div>
        <p className="truncate text-[13px]" style={{ color: "var(--mr-dim)" }}>
          {person.detail}
        </p>
      </div>
      <ChevronRight size={16} style={{ color: "var(--mr-faint)", flexShrink: 0 }} />
    </button>
  );
}
