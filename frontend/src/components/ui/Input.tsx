import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({
  label,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1 sm:space-y-2">
      <label
        htmlFor={inputId}
        className="block text-xs sm:text-sm font-medium text-text-primary/90"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "w-full rounded-md border bg-bg-primary/60 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-text-primary placeholder:text-text-primary/35 transition-colors",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
          error
            ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/25"
            : "border-border hover:border-accent/30",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="text-[10px] sm:text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
