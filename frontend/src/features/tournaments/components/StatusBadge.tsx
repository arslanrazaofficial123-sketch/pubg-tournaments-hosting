import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Tournament } from "@/types/tournament";

const STATUS_STYLES = {
  registration_open: "bg-cyan-500/20 text-cyan-400",
  upcoming: "bg-accent/20 text-accent",
  ongoing: "bg-emerald-500/20 text-emerald-400",
  ended: "bg-text-primary/10 text-text-primary/60",
} as const;

const STATUS_LABELS = {
  registration_open: "Registration Open",
  upcoming: "Upcoming",
  ongoing: "Live",
  ended: "Ended",
} as const;

interface StatusBadgeProps {
  status: Tournament["status"];
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
