import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Tournament } from "@/types/tournament";

const STATUS_STYLES = {
  registration_open: "bg-[#4d7cff]/15 text-[#a9c0ff] border border-[#4d7cff]/30",
  upcoming: "bg-[#f2b84b]/15 text-[#f2b84b] border border-[#f2b84b]/25",
  ongoing: "bg-emerald-500/20 text-emerald-400 border border-emerald-400/20",
  ended: "bg-text-primary/10 text-text-primary/60 border border-white/10",
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