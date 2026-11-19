"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  TournamentFilters,
  TournamentSections,
} from "@/features/tournaments";
import { ShowcaseSection } from "@/features/showcase";
import { HomeCta, HomeHowItWorks, HomeUcBand } from "@/components/home/HomeSections";

export default function Home() {
  const [activeSize, setActiveSize] = useState<string | null>(null);

  return (
    <PageShell heroVariant="home">
      <TournamentFilters activeSize={activeSize} onSizeChange={setActiveSize} />

      <section id="tournaments" className="mx-auto max-w-[1180px] scroll-mt-16 px-5 py-14 sm:px-10">
        <TournamentSections activeSize={activeSize} />
      </section>
      <ShowcaseSection />
      <HomeUcBand />
      <HomeHowItWorks />
      <HomeCta />
    </PageShell>
  );
}
