interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div>
      <span className="inline-flex items-center rounded-full border border-[#2a3b6e] bg-[#4d7cff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a9c0ff]">
        Tournaments
      </span>
      <h2 className="epx-hd mt-3 text-2xl font-bold text-[#e8eefc] sm:text-3xl">{title}</h2>
      <p className="mt-1.5 text-sm text-[#8da0c4]">{subtitle}</p>
    </div>
  );
}
