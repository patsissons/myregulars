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

export function Button({
  children,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-[120ms] select-none",
        "active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
}
