import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  size?: number;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  size = 18,
  className,
  type = "button",
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-[120ms]",
        "hover:bg-mr-subtle text-mr-dim hover:text-mr-text active:scale-[0.97]",
        className,
      )}
    >
      <Icon size={size} />
    </button>
  );
}
