import { Avatar } from "@/components/ui/avatar";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { cn } from "@/lib/cn";

interface PersonCardProps {
  person: {
    id: string;
    name: string;
    detail: string;
    lastSeen?: string;
    photoUrl?: string;
  };
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PersonCard({ person, active, onClick, className }: PersonCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-2 rounded-[12px] p-[14px] text-left transition-all duration-[120ms]",
        "border-mr-edge hover:bg-mr-subtle border hover:border-black/50! active:scale-[0.99]",
        className,
      )}
      style={{
        background: "var(--mr-panel)",
        ...(active
          ? { borderColor: "var(--mr-accent)", boxShadow: "0 0 0 3px var(--mr-accent-soft)" }
          : {}),
      }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={person.name} size={36} photoUrl={person.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="truncate text-[14px] font-[500]"
              style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
            >
              {person.name}
            </span>
            {person.lastSeen && (
              <span
                className="flex-shrink-0 text-[11px]"
                style={{ color: "var(--mr-faint)", fontVariantNumeric: "tabular-nums" }}
              >
                {formatLastSeen(person.lastSeen)}
              </span>
            )}
          </div>
        </div>
      </div>
      <p
        className="line-clamp-2 text-left text-[13px] leading-snug"
        style={{ color: "var(--mr-dim)" }}
      >
        {person.detail}
      </p>
    </button>
  );
}
