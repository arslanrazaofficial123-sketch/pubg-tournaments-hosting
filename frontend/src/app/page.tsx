"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  TournamentFilters,
  TournamentSections,
} from "@/features/tournaments";

export default function Home() {
  const [activeSize, setActiveSize] = useState<string | null>(null);

  return (
    <PageShell>
      <TournamentFilters activeSize={activeSize} onSizeChange={setActiveSize} />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <TournamentSections activeSize={activeSize} />
      </section>
    </PageShell>
  );
}
