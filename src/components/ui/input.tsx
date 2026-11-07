import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const fieldClasses = [
  // 16px on touch keeps iOS from zooming the page on focus.
  "w-full rounded-[10px] px-3 text-[16px] transition-colors duration-100 outline-none lg:text-[13px]",
  "bg-mr-subtle text-mr-text placeholder:text-mr-faint",
  "border-mr-edge focus:border-mr-accent border",
  "disabled:cursor-not-allowed disabled:opacity-60",
];

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldClasses, "coarse:h-11 h-8", className)} {...props} />;
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldClasses, "coarse:py-2.5 resize-none py-2", className)}
      {...props}
    />
  );
});
