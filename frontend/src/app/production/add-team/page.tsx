"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/services/api";
import {
  createProductionTeam,
  getProductionTournament,
  type ProductionTournament,
} from "@/services/api/production";
import {
  btnGhost,
  btnPrimary,
  PageHeading,
  ProductionShell,
  Spinner,
  useProductionGuard,
  useQueryParam,
} from "@/features/production/ProductionShell";
import { TeamForm } from "@/features/production/TeamForm";

export default function ProductionAddTeamPage() {
  const ready = useProductionGuard();
  const [tournament, setTournament] = useState<ProductionTournament | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const id = useQueryParam("id");
  const missing = id === "" || loadFailed;
  const [saved, setSaved] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!ready || !id) return;
    getProductionTournament(id)
      .then(setTournament)
      .catch(() => setLoadFailed(true));
  }, [ready, id]);

  if (!ready) return <ProductionShell><Spinner /></ProductionShell>;

  if (missing) {
    return (
      <ProductionShell>
        <PageHeading title="Choose a tournament first" back={{ href: "/production/desk", label: "All tournaments" }} />
      </ProductionShell>
    );
  }
  if (!tournament) return <ProductionShell><Spinner /></ProductionShell>;

  const back = `/production/tournament?id=${encodeURIComponent(tournament.id)}`;

  return (
    <ProductionShell>
      <PageHeading title="Add team manually" back={{ href: back, label: tournament.name }} />
      <div className="mx-auto max-w-3xl">
        {saved ? (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">✓ Team added successfully</p>
            <h2 className="mt-3 text-2xl font-semibold text-text-primary">&quot;{saved}&quot; is saved.</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setSaved("");
                  setFormKey((k) => k + 1);
                }}
              >
                + Add another team
              </button>
              <Link href={back} className={btnGhost}>
                Back to tournament
              </Link>
            </div>
          </div>
        ) : (
          <TeamForm
            key={formKey}
            submitLabel="Save team to tournament →"
            busyLabel="Uploading images..."
            onSubmit={async (payload) => {
              try {
                const team = await createProductionTeam({ tournamentId: tournament.id, ...payload });
                setSaved(team.teamName);
                return true;
              } catch (err) {
                throw new Error(err instanceof ApiError ? err.message : "Failed to save the team.");
              }
            }}
          />
        )}
      </div>
    </ProductionShell>
  );
}
