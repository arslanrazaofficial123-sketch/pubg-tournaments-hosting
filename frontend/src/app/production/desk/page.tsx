"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/services/api";
import {
  createProductionTournament,
  listProductionTournaments,
  type ProductionTournament,
} from "@/services/api/production";
import {
  btnPrimary,
  Eyebrow,
  inputCls,
  PageHeading,
  Panel,
  ProductionShell,
  Spinner,
  useProductionGuard,
} from "@/features/production/ProductionShell";
import { formatBytes, formatPkt, plural } from "@/features/production/utils";

export default function ProductionDeskPage() {
  const ready = useProductionGuard();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<ProductionTournament[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    listProductionTournaments()
      .then(setTournaments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tournaments."));
  }, [ready]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const t = await createProductionTournament(name.trim());
      router.push(`/production/tournament?id=${encodeURIComponent(t.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tournament.");
      setCreating(false);
    }
  };

  if (!ready) return <ProductionShell><Spinner /></ProductionShell>;

  const list = tournaments ?? [];
  const totals = list.reduce(
    (a, t) => ({ teams: a.teams + t.teamCount, photos: a.photos + t.photoCount, bytes: a.bytes + t.bytes }),
    { teams: 0, photos: 0, bytes: 0 },
  );

  return (
    <ProductionShell>
      <PageHeading title="Your production desk." />

      <div className="mb-10 grid grid-cols-2 gap-6 border-b border-border/60 pb-8 sm:grid-cols-4">
        {[
          [list.length, "Tournaments"],
          [totals.teams, "Teams received"],
          [totals.photos, "Player photos"],
          [formatBytes(totals.bytes), "Storage used"],
        ].map(([value, label]) => (
          <div key={label as string}>
            <p className="text-3xl font-bold text-text-primary">{tournaments ? value : "–"}</p>
            <p className="mt-1 text-sm text-text-primary/50">{label}</p>
          </div>
        ))}
      </div>

      <Panel className="mb-10">
        <form onSubmit={create} className="grid items-end gap-5 md:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>Start a collection</Eyebrow>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">New tournament</h2>
            <p className="mt-1 text-sm text-text-primary/50">Give it a name. Get a shareable upload link instantly.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm text-text-primary/70">Tournament name</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="e.g. Epix Friday Cup"
                className={inputCls}
              />
              <button type="submit" disabled={creating || !name.trim()} className={`${btnPrimary} shrink-0`}>
                {creating ? "Creating..." : "+ Create tournament"}
              </button>
            </div>
          </div>
        </form>
      </Panel>

      {error && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      <h2 className="text-xl font-semibold text-text-primary">Your tournaments</h2>
      <p className="mb-5 text-sm text-text-primary/50">Separate collections. Simple downloads.</p>

      {!tournaments ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-text-primary/50">
          No tournaments yet. Create your first one above.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {list.map((t) => (
            <Link
              key={t.id}
              href={`/production/tournament?id=${encodeURIComponent(t.id)}`}
              className="group rounded-2xl border border-border bg-bg-secondary/60 p-6 transition-colors hover:border-accent/60"
            >
              <p className={`flex items-center gap-2 text-xs font-medium ${t.isOpen ? "text-accent" : "text-text-primary/40"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${t.isOpen ? "bg-accent" : "bg-text-primary/40"}`} />
                {t.isOpen ? "Accepting uploads" : "Uploads closed"}
              </p>
              <h3 className="mt-4 text-2xl font-semibold text-text-primary group-hover:text-accent">{t.name}</h3>
              <p className="mt-2 text-sm text-text-primary/60">
                {plural(t.teamCount, "team")} · {plural(t.photoCount, "player photo")} · {formatBytes(t.bytes)}
              </p>
              <p className="mt-5 text-xs text-text-primary/40">
                {t.deadline ? `Deadline ${formatPkt(t.deadline)} (PKT)` : "No deadline"}
              </p>
              <p className="mt-5 border-t border-border/60 pt-4 text-sm font-semibold text-accent">Manage collection →</p>
            </Link>
          ))}
        </div>
      )}
    </ProductionShell>
  );
}
