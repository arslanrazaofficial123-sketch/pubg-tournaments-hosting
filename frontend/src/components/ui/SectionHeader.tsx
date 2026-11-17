interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-7 w-1 rounded-full bg-linear-to-b from-accent to-accent-2 shadow-lg shadow-accent/30" />
        <h2 className="bg-linear-to-r from-white to-accent bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
          {title}
        </h2>
      </div>
      <p className="mt-1.5 pl-4 text-sm text-text-primary/60">{subtitle}</p>
    </div>
  );
}