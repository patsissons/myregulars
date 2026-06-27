import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "dashed";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--mr-accent)",
    color: "var(--mr-accent-text)",
    border: "none",
  },
  secondary: {
    background: "transparent",
    color: "var(--mr-text)",
    border: "1px solid var(--mr-edge-strong)",
  },
  danger: {
    background: "transparent",
    color: "var(--mr-danger)",
    border: "1px solid var(--mr-danger)",
  },
  dashed: {
    background: "transparent",
    color: "var(--mr-dim)",
    border: "1.5px dashed var(--mr-edge-strong)",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-[12px]",
  md: "h-8 px-4 text-[13px]",
  lg: "h-10 px-5 text-[14px]",
};

// Hover per variant. The transparent variants set `background` via inline style,
// which a plain `hover:bg-*` utility cannot override — so they use the important
// (`!`) modifier to win over the inline value. The filled primary keeps a
// brightness shift instead, so its accent background is preserved.
const variantHover: Record<ButtonVariant, string> = {
  primary: "hover:brightness-95 dark:hover:brightness-110",
  secondary: "hover:bg-black/[0.05]! dark:hover:bg-white/[0.07]!",
  danger: "hover:bg-black/[0.05]! dark:hover:bg-white/[0.07]!",
  dashed: "hover:bg-black/[0.05]! dark:hover:bg-white/[0.07]!",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className,
  style,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-[120ms] select-none",
        "active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variantHover[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      style={{ ...variantStyles[variant], ...style }}
    >
      {children}
    </button>
  );
}
