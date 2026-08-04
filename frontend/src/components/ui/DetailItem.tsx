interface DetailItemProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function DetailItem({ label, value, accent = false }: DetailItemProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary/50 p-3">
      <p className="text-xs text-text-primary/50">{label}</p>
      <p
        className={`mt-0.5 text-sm font-medium ${accent ? "text-accent" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}
