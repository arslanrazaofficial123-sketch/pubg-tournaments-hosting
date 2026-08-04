import { PageShell } from "@/components/layout/PageShell";

interface ContentSectionProps {
  title: string;
  children: React.ReactNode;
}

export function ContentSection({ title, children }: ContentSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-text-primary/75">
        {children}
      </div>
    </section>
  );
}

interface ContentPageProps {
  heading: string;
  description: string;
  children: React.ReactNode;
}

export function ContentPage({ heading, description, children }: ContentPageProps) {
  return (
    <PageShell showHelpFab={false}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-text-primary/70">
            {description}
          </p>
        </div>

        <div className="space-y-6">{children}</div>
      </div>
    </PageShell>
  );
}
