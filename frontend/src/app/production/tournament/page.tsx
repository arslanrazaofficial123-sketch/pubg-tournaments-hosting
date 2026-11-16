"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ApiError } from "@/services/api";
import {
  deleteProductionTeam,
  downloadImage,
  downloadProductionRoster,
  downloadProductionTeamZip,
  getProductionTournament,
  listProductionTeams,
  updateProductionTeam,
  updateProductionTournament,
  type ProductionTeam,
  type ProductionTournament,
} from "@/services/api/production";
import {
  btnGhost,
  btnPrimary,
  Eyebrow,
  inputCls,
  linkCls,
  PageHeading,
  Panel,
  ProductionShell,
  Spinner,
  useProductionGuard,
  useQueryParam,
} from "@/features/production/ProductionShell";
import { formatBytes, formatPkt, isoToPktInput, pktInputToIso, plural, timeLeft } from "@/features/production/utils";

type Filter = "all" | "organizer" | "link" | "photos" | "logo";

const FILTERS: Array<[Filter, string]> = [
  ["all", "All submissions"],
  ["link", "Uploaded via link"],
  ["organizer", "Added by organizer"],
  ["photos", "With player photos"],
  ["logo", "Logo only"],
];

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function ProductionTournamentPage() {
  const ready = useProductionGuard();
  const [tournament, setTournament] = useState<ProductionTournament | null>(null);
  const [teams, setTeams] = useState<ProductionTeam[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [saving, setSaving] = useState<"" | "deadline" | "toggle" | "groups">("");
  const [zipping, setZipping] = useState<string>("");
  const [savingTeam, setSavingTeam] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [groupFilter, setGroupFilter] = useState("");


  const id = useQueryParam("id");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const missing = id === "" || notFound;

  useEffect(() => {
    if (!ready || !id) return;
    let live = true;
    Promise.all([getProductionTournament(id), listProductionTeams(id)])
      .then(([t, list]) => {
        if (!live) return;
        setTournament(t);
        setTeams(list);
        setDeadlineInput(isoToPktInput(t.deadline));
        setShareUrl(t.slug ? `${window.location.origin}/p/${t.slug}` : "");
      })
      .catch((err) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(errMsg(err, "Failed to load tournament."));
      });
    return () => {
      live = false;
    };
  }, [ready, id, reloadKey]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      flash("Link copied");
    } catch {
      setError("Could not copy — select the link and copy it manually.");
    }
  };

  const saveDeadline = async () => {
    if (!tournament) return;
    setSaving("deadline");
    setError("");
    try {
      const t = await updateProductionTournament(tournament.id, { deadline: pktInputToIso(deadlineInput) });
      setTournament(t);
      setDeadlineInput(isoToPktInput(t.deadline));
      flash(t.deadline ? "Deadline saved" : "Deadline removed");
    } catch (err) {
      setError(errMsg(err, "Failed to save deadline."));
    } finally {
      setSaving("");
    }
  };

  const toggleUploads = async () => {
    if (!tournament) return;
    setSaving("toggle");
    setError("");
    try {
      setTournament(await updateProductionTournament(tournament.id, { acceptingUploads: !tournament.acceptingUploads }));
    } catch (err) {
      setError(errMsg(err, "Failed to update uploads."));
    } finally {
      setSaving("");
    }
  };

  const downloadAll = async () => {
    if (!tournament) return;
    setZipping("all");
    setError("");
    try {
      await downloadProductionRoster(tournament.id);
    } catch (err) {
      setError(errMsg(err, "Download failed."));
    } finally {
      setZipping("");
    }
  };

  const downloadTeam = async (team: ProductionTeam) => {
    setZipping(team.id);
    setError("");
    try {
      await downloadProductionTeamZip(team.id);
    } catch (err) {
      setError(errMsg(err, "Download failed."));
    } finally {
      setZipping("");
    }
  };

  const removeTeam = async (team: ProductionTeam) => {
    if (confirmDelete !== team.id) {
      setConfirmDelete(team.id);
      return;
    }
    setError("");
    try {
      await deleteProductionTeam(team.id);
      setConfirmDelete("");
      reload();
      flash(`"${team.teamName}" deleted`);
    } catch (err) {
      setError(errMsg(err, "Failed to delete team."));
    }
  };

  /** Moves a team to another group; the badge updates immediately and rolls back if the save fails. */
  const changeGroup = async (team: ProductionTeam, group: string) => {
    if ((team.group || "A") === group) return;
    const before = team.group;
    setError("");
    setSavingTeam(team.id);
    setTeams((prev) => (prev ? prev.map((t) => (t.id === team.id ? { ...t, group } : t)) : prev));
    try {
      await updateProductionTeam(team.id, { group });
      flash(`"${team.teamName}" moved to Group ${group}`);
    } catch (err) {
      setTeams((prev) => (prev ? prev.map((t) => (t.id === team.id ? { ...t, group: before } : t)) : prev));
      setError(errMsg(err, "Failed to change the group."));
    } finally {
      setSavingTeam("");
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (teams ?? []).filter((t) => {
      if (groupFilter && (t.group || "A") !== groupFilter) return false;
      if (filter === "organizer" && t.source !== "organizer") return false;
      if (filter === "link" && t.source !== "link") return false;
      if (filter === "photos" && t.players.length === 0) return false;
      if (filter === "logo" && t.players.length > 0) return false;
      if (!q) return true;
      return t.teamName.toLowerCase().includes(q) || t.players.some((p) => p.uid.includes(q));
    });
  }, [teams, query, filter, groupFilter]);

  /** How many teams sit in each group — counts the whole roster, not the filtered view. */
  const groupTotals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of tournament?.groups ?? []) counts.set(g, 0);
    for (const t of teams ?? []) {
      const g = t.group || "A";
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return Array.from(counts, ([group, count]) => ({ group, count }));
  }, [teams, tournament]);

  if (!ready) return <ProductionShell><Spinner /></ProductionShell>;

  if (missing) {
    return (
      <ProductionShell>
        <PageHeading title="Tournament not found" back={{ href: "/production/desk", label: "All tournaments" }} />
      </ProductionShell>
    );
  }

  if (!tournament || !teams) {
    return (
      <ProductionShell>
        {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : <Spinner />}
      </ProductionShell>
    );
  }

  return (
    <ProductionShell>
      <PageHeading title={tournament.name} back={{ href: "/production/desk", label: "All tournaments" }} />

      <div className="space-y-5">
        <Panel>
          <Eyebrow>Team upload link</Eyebrow>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Send this to your teams.</h2>
          <p className="mt-1 text-sm text-text-primary/50">
            No account needed. Team name and logo required; player photos optional. Teams get a private link to edit until the deadline.
          </p>
          <label className="mt-5 mb-2 block text-sm text-text-primary/70">Share link</label>
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} className={`${inputCls} font-mono`} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={copyLink} disabled={!shareUrl} className={btnPrimary}>
              Copy link
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
              Preview upload page ↗
            </a>
          </div>
        </Panel>

        <Panel>
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <label className="mb-2 block text-sm text-text-primary/70">Upload &amp; edit deadline (Pakistan time)</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="datetime-local"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`}
                />
                <button type="button" onClick={saveDeadline} disabled={saving !== ""} className={`${btnGhost} shrink-0`}>
                  {saving === "deadline" ? "Saving..." : "Save deadline"}
                </button>
              </div>
              <p className="mt-2 text-xs text-text-primary/40">
                Leave empty to remove the deadline.{" "}
                {tournament.deadline ? `${formatPkt(tournament.deadline)} · ${timeLeft(tournament.deadline)}` : "No deadline"}
              </p>
            </div>
            <div>
              <Eyebrow>Storage used</Eyebrow>
              <p className="mt-2 text-3xl font-bold text-text-primary">{formatBytes(tournament.bytes)}</p>
              <p className="mt-1 text-xs text-text-primary/40">All stored logos and player photos for this tournament.</p>
            </div>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="flex items-center gap-3 text-sm">
            <span className={`flex items-center gap-2 ${tournament.isOpen ? "text-accent" : "text-text-primary/40"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tournament.isOpen ? "bg-accent" : "bg-text-primary/40"}`} />
              {tournament.isOpen ? "Accepting uploads" : tournament.acceptingUploads ? "Closed (deadline passed)" : "Uploads closed"}
            </span>
            <span className="text-text-primary/60">{plural(tournament.teamCount, "team")} received</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-text-primary/60">Groups:</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                disabled={saving !== ""}
                onClick={async () => {
                  setSaving("groups");
                  try {
                    setTournament(await updateProductionTournament(tournament.id, { groupCount: n }));
                  } finally {
                    setSaving("");
                  }
                }}
                className={`cursor-pointer rounded-lg border px-3 py-1 text-xs font-semibold ${
                  (tournament.groupCount || 1) === n ? "border-accent bg-accent/15 text-accent" : "border-border text-text-primary/60"
                }`}
              >
                {n === 1 ? "None" : "ABCD".slice(0, n).split("").join(" ")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={toggleUploads} disabled={saving !== ""} className={btnGhost}>
              {saving === "toggle" ? "Saving..." : tournament.acceptingUploads ? "Close uploads" : "Open uploads"}
            </button>
            <Link href={`/production/add-team?id=${encodeURIComponent(tournament.id)}`} className={btnPrimary}>
              + Add team manually
            </Link>
            <button type="button" onClick={downloadAll} disabled={zipping !== "" || teams.length === 0} className={btnPrimary}>
              {zipping === "all" ? "Preparing ZIP..." : "↓ Download all (ZIP)"}
            </button>
          </div>
        </div>

        {(tournament.groups?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-text-primary/60">Teams per group:</span>
            {groupTotals.map(({ group, count }) => {
              const active = groupFilter === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setGroupFilter(active ? "" : group)}
                  title={active ? "Show all groups" : `Show only Group ${group}`}
                  className={`cursor-pointer rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-text-primary/70 hover:bg-white/5"
                  }`}
                >
                  Group {group} · {plural(count, "team")}
                </button>
              );
            })}
            {groupFilter && (
              <button type="button" onClick={() => setGroupFilter("")} className={linkCls}>
                Show all groups ×
              </button>
            )}
          </div>
        )}

        {(error || notice) && (
          <p
            className={`rounded-xl border px-4 py-3 text-sm ${
              error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-accent/30 bg-accent/10 text-accent"
            }`}
          >
            {error || notice}
          </p>
        )}

        <Panel>
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm text-text-primary/70">Search team or UID</label>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Team name or player UID" className={inputCls} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-text-primary/70">Show</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={`${inputCls} cursor-pointer`}>
                {FILTERS.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => { setQuery(""); setFilter("all"); setGroupFilter(""); }} className={`${linkCls} pb-3`}>
              Reset
            </button>
          </div>
        </Panel>

        {teams.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-text-primary/50">
            No teams yet. Share the upload link or add a team manually.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-2 py-6 text-sm text-text-primary/50">
            {groupFilter
              ? query.trim() === "" && filter === "all"
                ? `No teams in Group ${groupFilter} yet.`
                : `No teams in Group ${groupFilter} match these filters.`
              : "No teams match this search."}
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {visible.map((team) => (
              <article key={team.id} className="flex flex-col rounded-2xl border border-border bg-bg-secondary/60 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-primary">
                    <Image src={team.teamLogo} alt={team.teamName} width={64} height={64} unoptimized className="h-full w-full object-contain p-1" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xl font-semibold text-text-primary">{team.teamName}</h3>
                      {(tournament.groups?.length ?? 0) > 0 && (
                        <label className="inline-flex items-center" title="Change this team's group">
                          <span className="sr-only">Group for {team.teamName}</span>
                          <select
                            value={team.group || "A"}
                            disabled={savingTeam === team.id}
                            onChange={(e) => changeGroup(team, e.target.value)}
                            className="cursor-pointer rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent outline-none transition-colors hover:bg-accent/15 focus:border-accent disabled:cursor-wait disabled:opacity-60"
                          >
                            {(tournament.groups ?? []).map((g) => (
                              <option key={g} value={g} className="bg-bg-primary text-text-primary">
                                Group {g}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-text-primary/60">
                        {team.source === "link" ? "Uploaded via link" : "Added by organizer"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-primary/50">
                      {plural(team.players.length, "UID")} · {plural(team.players.length, "photo")} · {formatBytes(team.bytes)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  <button type="button" className={linkCls} onClick={() => downloadImage(team.teamLogo, team.teamName)}>
                    Download logo
                  </button>
                  <button type="button" className={linkCls} disabled={zipping !== ""} onClick={() => downloadTeam(team)}>
                    {zipping === team.id ? "Preparing..." : "Download team ZIP ↓"}
                  </button>
                </div>

                <div className="mt-5 flex-1">
                  {team.players.length === 0 ? (
                    <p className="text-sm text-text-primary/50">Logo only — no player photos submitted.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {team.players.map((p) => (
                        <button
                          key={p.uid}
                          type="button"
                          title={`Download ${p.uid}`}
                          onClick={() => downloadImage(p.photo, p.uid)}
                          className="group cursor-pointer text-left"
                        >
                          <Image src={p.photo} alt={p.uid} width={120} height={120} unoptimized className="aspect-square w-full rounded-lg border border-border object-cover transition-opacity group-hover:opacity-80" />
                          <span className="mt-1 block truncate font-mono text-[11px] text-text-primary/60">{p.uid}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <span className="text-xs text-text-primary/40">{team.createdAt ? formatPkt(team.createdAt) : ""}</span>
                  <div className="flex gap-2">
                    {confirmDelete === team.id && (
                      <button type="button" onClick={() => setConfirmDelete("")} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-text-primary/60 hover:bg-white/5">
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTeam(team)}
                      className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                    >
                      {confirmDelete === team.id ? "Confirm delete" : "Delete team"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ProductionShell>
  );
}
