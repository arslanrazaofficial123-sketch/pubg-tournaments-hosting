"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { ProductionPlayer, TeamPayload } from "@/services/api/production";
import { btnPrimary, inputCls, Panel } from "./ProductionShell";
import { LOGO_OPTS, MAX_PAYLOAD_CHARS, PHOTO_OPTS, prepareImage } from "./utils";

interface PlayerRow {
  key: string;
  uid: string;
  photo: string; // data URL (new) or https URL (already stored)
  label: string;
}

function rowKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface TeamFormProps {
  initial?: { teamName: string; teamLogo: string; players: ProductionPlayer[] };
  maxPlayers?: number;
  submitLabel: string;
  busyLabel?: string;
  disabled?: boolean;
  /** Should throw an Error with a user-facing message on failure. Return true to reset the form. */
  onSubmit: (payload: TeamPayload) => Promise<boolean | void>;
}

export function TeamForm({
  initial,
  maxPlayers = 16,
  submitLabel,
  busyLabel = "Uploading...",
  disabled = false,
  onSubmit,
}: TeamFormProps) {
  const [teamName, setTeamName] = useState(initial?.teamName ?? "");
  const [logo, setLogo] = useState(initial?.teamLogo ?? "");
  const [logoLabel, setLogoLabel] = useState(initial?.teamLogo ? "Current logo" : "");
  const [players, setPlayers] = useState<PlayerRow[]>(
    (initial?.players ?? []).map((p) => ({ key: rowKey(), uid: p.uid, photo: p.photo, label: "Saved photo" })),
  );
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const pickLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setReading(true);
    try {
      setLogo(await prepareImage(file, LOGO_OPTS));
      setLogoLabel(file.name);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the logo.");
    } finally {
      setReading(false);
    }
  };

  const pickPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = maxPlayers - players.length;
    if (room <= 0) {
      setError(`Maximum ${maxPlayers} players.`);
      return;
    }
    setReading(true);
    try {
      const rows: PlayerRow[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        rows.push({ key: rowKey(), uid: "", photo: await prepareImage(file, PHOTO_OPTS), label: file.name });
      }
      setPlayers((prev) => [...prev, ...rows]);
      setError(files.length > room ? `Only ${room} more photo(s) allowed — extra files were skipped.` : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read one of the photos.");
    } finally {
      setReading(false);
    }
  };

  const replacePhoto = async (key: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setReading(true);
    try {
      const photo = await prepareImage(file, PHOTO_OPTS);
      setPlayers((prev) => prev.map((p) => (p.key === key ? { ...p, photo, label: file.name } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the photo.");
    } finally {
      setReading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!logo) return setError("Team logo is required.");
    if (!teamName.trim()) return setError("Team name is required.");
    const uids = new Set<string>();
    for (const p of players) {
      if (!/^\d{1,32}$/.test(p.uid)) return setError("Every player photo needs a numeric UID.");
      if (uids.has(p.uid)) return setError(`UID ${p.uid} is entered twice.`);
      uids.add(p.uid);
    }
    const size = logo.length + players.reduce((s, p) => s + p.photo.length, 0);
    if (size > MAX_PAYLOAD_CHARS) {
      return setError("These images are too large to send together. Remove a few photos or use smaller files.");
    }
    setBusy(true);
    try {
      const reset = await onSubmit({
        teamName: teamName.trim(),
        teamLogo: logo,
        players: players.map((p) => ({ uid: p.uid, photo: p.photo })),
      });
      if (reset) {
        setTeamName("");
        setLogo("");
        setLogoLabel("");
        setPlayers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const locked = disabled || busy;

  return (
    <form onSubmit={submit} className="space-y-6">
      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <span className="font-mono text-xs text-accent">01</span>
          <h2 className="text-lg font-semibold text-text-primary">Team essentials</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <button
            type="button"
            disabled={locked}
            onClick={() => logoRef.current?.click()}
            className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-border bg-bg-primary text-sm text-text-primary/60 transition-colors hover:border-accent/60 disabled:cursor-not-allowed"
          >
            {logo ? (
              <Image src={logo} alt="Team logo" width={180} height={180} unoptimized className="h-full w-full object-contain p-3" />
            ) : (
              <>
                <span className="text-2xl text-accent">↑</span>
                <span className="font-semibold">Upload logo</span>
                <span className="text-[11px] text-text-primary/40">PNG · JPG · WebP</span>
              </>
            )}
          </button>
          <input
            ref={logoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              pickLogo(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary/80">
              Team name <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              maxLength={60}
              disabled={locked}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Falcon Esports"
              className={inputCls}
            />
            <p className="text-xs text-text-primary/40">
              Logo is required. {logoLabel && <span className="text-text-primary/60">Selected: {logoLabel}</span>}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-accent">02</span>
            <h2 className="text-lg font-semibold text-text-primary">Player photos &amp; UIDs</h2>
          </div>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
            Optional
          </span>
        </div>
        <p className="mb-5 text-sm text-text-primary/50">
          Add each player&apos;s photo and type their numeric PUBG MOBILE UID. Up to {maxPlayers} players.
        </p>

        {players.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {players.map((p) => (
              <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-bg-primary p-3">
                <Image src={p.photo} alt={p.label} width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={p.uid}
                    disabled={locked}
                    onChange={(e) =>
                      setPlayers((prev) =>
                        prev.map((r) => (r.key === p.key ? { ...r, uid: e.target.value.replace(/\D/g, "").slice(0, 32) } : r)),
                      )
                    }
                    placeholder="Player UID"
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-primary/30 focus:border-accent focus:outline-none"
                  />
                  <div className="mt-1.5 flex gap-3 text-xs">
                    <label className="cursor-pointer text-text-primary/60 hover:text-accent">
                      Replace
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={locked}
                        onChange={(e) => {
                          replacePhoto(p.key, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setPlayers((prev) => prev.filter((r) => r.key !== p.key))}
                      className="cursor-pointer text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={locked || players.length >= maxPlayers}
          onClick={() => photosRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-sm font-semibold text-text-primary/70 transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Choose player photos
        </button>
        <input
          ref={photosRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            pickPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </Panel>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={locked || reading} className={`${btnPrimary} w-full py-4 text-base`}>
        {busy ? busyLabel : reading ? "Reading images..." : submitLabel}
      </button>
      {disabled && <p className="text-center text-xs text-text-primary/40">This form is closed.</p>}
    </form>
  );
}
