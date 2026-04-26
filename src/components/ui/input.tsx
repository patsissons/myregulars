import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[10px] px-3 py-2 text-[13px] transition-colors duration-100 outline-none",
        "bg-mr-subtle text-mr-text placeholder:text-mr-faint",
        "border-mr-edge focus:border-mr-accent border",
        className,
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-[10px] px-3 py-2 text-[13px] transition-colors duration-100 outline-none",
        "bg-mr-subtle text-mr-text placeholder:text-mr-faint",
        "border-mr-edge focus:border-mr-accent border",
        className,
      )}
      {...props}
    />
  );
}
