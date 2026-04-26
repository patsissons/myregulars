import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProviderRowProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onClick?: () => void;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export function ProviderRow({
  name,
  description,
  icon,
  enabled,
  onClick,
  isLoading,
  error,
  className,
}: ProviderRowProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={enabled ? onClick : undefined}
        disabled={!enabled || isLoading}
        className={cn(
          "flex w-full items-center gap-3 rounded-[14px] p-[14px] text-left transition-colors duration-100",
          "border",
          enabled && !isLoading && "hover:bg-mr-subtle active:opacity-80",
          (!enabled || isLoading) && "cursor-not-allowed",
        )}
        style={{
          background: "var(--mr-panel)",
          borderColor: "var(--mr-edge)",
          opacity: enabled ? 1 : 0.55,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--mr-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-[500]" style={{ color: "var(--mr-text)" }}>
            {name}
          </p>
          <p className="text-[12px]" style={{ color: "var(--mr-dim)" }}>
            {description}
          </p>
        </div>

        {/* Right side */}
        {isLoading ? (
          <Loader2
            size={16}
            className="animate-spin"
            style={{ color: "var(--mr-dim)", flexShrink: 0 }}
          />
        ) : (
          <ChevronRight size={16} style={{ color: "var(--mr-faint)", flexShrink: 0 }} />
        )}
      </button>

      {error && (
        <p className="px-2 text-[13px]" style={{ color: "var(--mr-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
