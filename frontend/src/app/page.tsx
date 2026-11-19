"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  TournamentFilters,
  TournamentSections,
} from "@/features/tournaments";
import { ShowcaseSection } from "@/features/showcase";

export default function Home() {
  const [activeSize, setActiveSize] = useState<string | null>(null);

  return (
    <PageShell heroVariant="home">
      <TournamentFilters activeSize={activeSize} onSizeChange={setActiveSize} />

      <section id="tournaments" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-14 sm:px-6 lg:px-8">
        <TournamentSections activeSize={activeSize} />
      </section>
      <ShowcaseSection />
    </PageShell>
  );
}
