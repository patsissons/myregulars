import { cn } from "@/lib/cn";

interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  variant?: "default" | "accent" | "dashed";
  className?: string;
}

export function Chip({ children, active, onClick, variant = "default", className }: ChipProps) {
  const base =
    "inline-flex items-center text-[13px] leading-none select-none transition-colors duration-100";

  const styles: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 999,
    cursor: onClick ? "pointer" : "default",
  };

  if (variant === "dashed") {
    styles.background = "transparent";
    styles.border = "1.5px dashed var(--mr-edge-strong)";
    styles.color = "var(--mr-dim)";
  } else if (active) {
    styles.background = "var(--mr-text)";
    styles.color = "var(--mr-bg)";
  } else if (variant === "accent") {
    styles.background = "var(--mr-accent-soft)";
    styles.color = "var(--mr-accent)";
    styles.border = `1px solid var(--mr-accent-soft-border)`;
  } else {
    styles.background = "var(--mr-chip)";
    styles.color = "var(--mr-chip-text)";
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(base, "active:scale-[0.97]", className)}
        style={styles}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={cn(base, className)} style={styles}>
      {children}
    </span>
  );
}
