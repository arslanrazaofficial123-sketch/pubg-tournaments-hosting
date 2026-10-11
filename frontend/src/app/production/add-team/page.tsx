"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ApiError } from "@/services/api";
import {
  clearProductionToken,
  createProductionTeam,
  createProductionTournament,
  downloadProductionRoster,
  listProductionTeams,
  listProductionTournaments,
  productionToken,
  type ProductionTeam,
  type ProductionTournament,
} from "@/services/api/production";

const MAX_PLAYERS = 16;

interface PlayerRow {
  key: string;
  uid: string;
  photoDataUrl: string;
  fileName: string;
}

function rowKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function ProductionAddTeamPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tournaments, setTournaments] = useState<ProductionTournament[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [creating, setCreating] = useState(false);
  const [tournamentId, setTournamentId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [savedTeam, setSavedTeam] = useState<ProductionTeam | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const photoPickerRef = useRef<HTMLInputElement>(null);
  const logoPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!productionToken()) {
      router.replace("/production");
      return;
    }
    const fromUrl = new URLSearchParams(window.location.search).get("id") || "";
    setTournamentId(fromUrl);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    listProductionTournaments()
      .then((list) => {
        setTournaments(list);
        setTournamentId((current) => current || list[0]?.id || "");
      })
      .catch(() => setError("Failed to load tournaments."));
  }, [ready]);

  const refreshCount = useCallback(async (id: string) => {
    try {
      const list = await listProductionTeams(id);
      setTeamCount(list.length);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (ready && tournamentId) refreshCount(tournamentId);
  }, [ready, tournamentId, refreshCount]);

  const handleLogout = () => {
    clearProductionToken();
    router.replace("/production");
  };

  const handleTournamentChange = (value: string) => {
    setTournamentId(value);
    setSavedTeam(null);
    setError("");
    const url = value
      ? `/production/add-team?id=${encodeURIComponent(value)}`
      : "/production/add-team";
    window.history.replaceState(null, "", url);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const created = await createProductionTournament(newTournamentName.trim());
      const list = await listProductionTournaments();
      setTournaments(list);
      setTournamentId(created.id);
      setNewTournamentName("");
      setShowCreateForm(false);
      setSavedTeam(null);
      window.history.replaceState(
        null,
        "",
        `/production/add-team?id=${encodeURIComponent(created.id)}`,
      );
      refreshCount(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tournament.");
    } finally {
      setCreating(false);
    }
  };

  const handleLogoPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      setLogoDataUrl(await fileToDataUrl(file));
      setLogoFileName(file.name);
      setError("");
    } catch {
      setError("Could not read the logo file.");
    }
  };

  const handlePhotosPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PLAYERS - players.length;
    if (room <= 0) {
      setError(`Maximum ${MAX_PLAYERS} players allowed.`);
      return;
    }
    const chosen = Array.from(files).slice(0, room);
    try {
      const rows: PlayerRow[] = [];
      for (const file of chosen) {
        rows.push({
          key: rowKey(),
          uid: "",
          photoDataUrl: await fileToDataUrl(file),
          fileName: file.name,
        });
      }
      setPlayers((prev) => [...prev, ...rows]);
      setError("");
    } catch {
      setError("Could not read one of the photos.");
    }
  };

  const updatePlayerUid = (key: string, uid: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.key === key ? { ...p, uid: uid.replace(/\D/g, "").slice(0, 32) } : p)),
    );
  };

  const replacePlayerPhoto = async (key: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setPlayers((prev) =>
        prev.map((p) => (p.key === key ? { ...p, photoDataUrl: dataUrl, fileName: file.name } : p)),
      );
    } catch {
      setError("Could not read the replacement photo.");
    }
  };

  const removePlayer = (key: string) => {
    setPlayers((prev) => prev.filter((p) => p.key !== key));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSavedTeam(null);
    if (!tournamentId) {
      setError("Choose a tournament first.");
      return;
    }
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!logoDataUrl) {
      setError("Team logo is required.");
      return;
    }
    for (const p of players) {
      if (!/^\d{1,32}$/.test(p.uid)) {
        setError("Every player photo needs a numeric UID.");
        return;
      }
    }
    setBusy(true);
    try {
      const team = await createProductionTeam({
        tournamentId,
        teamName: teamName.trim(),
        teamLogo: logoDataUrl,
        players: players.map((p) => ({ uid: p.uid, photo: p.photoDataUrl })),
      });
      setSavedTeam(team);
      setTeamName("");
      setLogoDataUrl("");
      setLogoFileName("");
      setPlayers([]);
      if (photoPickerRef.current) photoPickerRef.current.value = "";
      if (logoPickerRef.current) logoPickerRef.current.value = "";
      refreshCount(tournamentId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearProductionToken();
        router.replace("/production");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to save the team.");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!tournamentId || downloading) return;
    setDownloading(true);
    setError("");
    try {
      await downloadProductionRoster(tournamentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              EPIX Production
            </span>
            <h1 className="text-xl font-black uppercase tracking-wider text-text-primary">
              Add Team Manually
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-primary/50">
              {teamCount != null ? `${teamCount} team${teamCount === 1 ? "" : "s"} saved` : ""}
            </span>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!tournamentId || downloading || (teamCount != null && teamCount === 0)}
              className="cursor-pointer rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {downloading ? "Preparing..." : "Download roster ZIP"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-primary/70 transition-colors hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mb-6 rounded-2xl border border-border bg-bg-secondary p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
              Tournament
            </label>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
              className="cursor-pointer rounded-lg border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + New tournament
            </button>
          </div>

          {tournaments.length > 0 && (
            <select
              value={tournamentId}
              onChange={(e) => handleTournamentChange(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">Select a tournament…</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {tournaments.length === 0 && !showCreateForm && (
            <p className="rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-center text-sm text-text-primary/50">
              Create a tournament first to start adding teams.
            </p>
          )}

          {showCreateForm && (
            <form onSubmit={handleCreateTournament} className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                placeholder="Tournament name (e.g. Epix Friday Cup)"
                autoFocus
                className="min-w-40 flex-1 rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newTournamentName.trim()}
                className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-text-primary hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save"}
              </button>
              {tournaments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTournamentName("");
                    setError("");
                  }}
                  className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary/70 hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </form>
          )}
        </div>

        {savedTeam && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              ✓ Team added successfully
            </p>
            <h2 className="mt-2 text-lg font-bold text-text-primary">
              Team &quot;{savedTeam.teamName}&quot; is saved!
            </h2>
            <p className="mt-1 text-sm text-text-primary/60">
              This team is stored in the production list only.
            </p>
            <button
              type="button"
              onClick={() => setSavedTeam(null)}
              className="mt-4 cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-bold text-text-primary hover:bg-accent-hover"
            >
              + Add Another Team
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl border border-border bg-bg-secondary p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-text-primary">
              01 Team essentials
            </h2>
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => logoPickerRef.current?.click()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-sm font-semibold text-text-primary/70 transition-colors hover:border-accent/50"
                >
                  {logoDataUrl ? `Logo: ${logoFileName || "selected"}` : "↑ Upload team logo"}
                </button>
                <p className="mt-1.5 text-xs text-text-primary/40">
                  Choose PNG, JPG, or WebP. Required.
                </p>
                <input
                  ref={logoPickerRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleLogoPick(e.target.files)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
                  Team name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Falcon Esports"
                  className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-bg-secondary p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">
                02 Player media &amp; UIDs
              </h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-primary/40">
                Optional
              </span>
            </div>
            <p className="mb-3 text-xs text-text-primary/50">
              Add player photos. Each photo needs its numeric Game UID. Up to {MAX_PLAYERS} players.
            </p>
            <button
              type="button"
              onClick={() => photoPickerRef.current?.click()}
              disabled={players.length >= MAX_PLAYERS}
              className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-sm font-semibold text-text-primary/70 transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Choose player photos
            </button>
            <input
              ref={photoPickerRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePhotosPick(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="space-y-3">
              {players.map((p) => (
                <div
                  key={p.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-primary p-3"
                >
                  <Image
                    src={p.photoDataUrl}
                    alt={p.fileName}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-lg object-cover"
                    unoptimized
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-text-primary/50">{p.fileName}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.uid}
                      onChange={(e) => updatePlayerUid(p.key, e.target.value)}
                      placeholder="Player UID (required)"
                      className="mt-1 w-full rounded-lg border border-border bg-bg-secondary px-3 py-1.5 font-mono text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-lg border border-border px-2 py-1 text-xs font-semibold text-text-primary/60 hover:bg-white/5">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          replacePlayerPhoto(p.key, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.key)}
                      className="cursor-pointer rounded-lg border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !tournamentId}
            className="w-full cursor-pointer rounded-xl bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save team to tournament →"}
          </button>
        </form>

        <footer className="mt-8 text-center text-xs text-text-primary/40">
          EPIX PRODUCTION · Tournament teams, organized.
        </footer>
      </div>
    </div>
  );
}
