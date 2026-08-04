import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}
