import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap select-none",
    "transition-all duration-[120ms] active:scale-[0.97]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:ring-mr-accent focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
    // Touch devices get a 44px row regardless of the visual size.
    "coarse:min-h-11",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-mr-accent text-mr-accent-text border border-transparent hover:brightness-95 dark:hover:brightness-110",
        secondary:
          "text-mr-text border-mr-edge-strong border bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
        danger:
          "text-mr-danger border-mr-danger border bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
        dashed:
          "text-mr-dim border-mr-edge-strong border-[1.5px] border-dashed bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
        ghost:
          "text-mr-dim hover:text-mr-text border border-transparent bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
      },
      size: {
        sm: "h-7 px-3 text-[12px]",
        md: "h-8 px-4 text-[13px]",
        lg: "h-10 px-5 text-[14px]",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a <button>, merging classes and props (links, Radix triggers). */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      // Only a real <button> gets a default type; a Slot child keeps its own.
      {...(asChild ? {} : { type: type ?? "button" })}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
});
