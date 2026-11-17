"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchShowcase, createShowcase, updateShowcase, deleteShowcase, type ShowcaseItem } from "@/services/api/showcase";

const toDataUrl = (f: File) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

const empty = { tournamentName: "", winnerTeam: "", dateLabel: "", organizer: "", youtubeUrl: "" };

export function ShowcaseAdmin() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [f, setF] = useState(empty);
  const [champ, setChamp] = useState<File | null>(null);
  const [rank, setRank] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetchShowcase(true).then(setItems); }, []);
  useEffect(load, [load]);

  function reset() { setF(empty); setChamp(null); setRank(null); setEditId(null); }

  async function save() {
    if (!f.tournamentName.trim()) { setMsg("Tournament name is required."); return; }
    if (!editId && !champ && !rank) { setMsg("Choose at least one picture."); return; }
    setBusy(true); setMsg("");
    try {
      const body = { ...f, champion: champ ? await toDataUrl(champ) : undefined, rankings: rank ? await toDataUrl(rank) : undefined };
      if (editId) await updateShowcase(editId, body); else await createShowcase(body);
      reset(); setMsg("Saved."); load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  }

  const inp = "w-full rounded-lg border border-border bg-black/30 px-3 py-2 text-sm";
  const key = (k: keyof typeof empty, ph: string) => (
    <input className={inp} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-3 rounded-2xl border border-border p-5">
        <h3 className="text-lg font-bold">{editId ? "Edit tournament result" : "Add finished tournament to homepage"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {key("tournamentName", "Tournament name *")}
          {key("winnerTeam", "Winner team (e.g. S7 ALPHA)")}
          {key("dateLabel", "Date (e.g. Oct 23, 2026)")}
          {key("organizer", "Organizer (optional)")}
          <div className="sm:col-span-2">{key("youtubeUrl", "Grand final / live stream YouTube link (optional)")}</div>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <label className="space-y-1"><span className="block font-semibold">Champion poster</span>
            <input type="file" accept="image/*" onChange={(e) => setChamp(e.target.files?.[0] ?? null)} /></label>
          <label className="space-y-1"><span className="block font-semibold">Final overall rankings picture</span>
            <input type="file" accept="image/*" onChange={(e) => setRank(e.target.files?.[0] ?? null)} /></label>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
            {busy ? "Saving…" : editId ? "Save changes" : "Upload"}
          </button>
          {editId && <button onClick={reset} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>}
          {msg && <span className="text-sm opacity-80">{msg}</span>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <div key={i.id} className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-2">
              {[i.championUrl, i.rankingsUrl].map((u, n) => (
                // eslint-disable-next-line @next/next/no-img-element
                u ? <img key={n} src={u} alt="" className="aspect-[4/5] w-full object-cover" /> : <div key={n} className="aspect-[4/5] bg-black/40" />
              ))}
            </div>
            <div className="space-y-2 p-3 text-sm">
              <div className="font-bold">{i.tournamentName}</div>
              <div className="opacity-70">{[i.winnerTeam, i.dateLabel].filter(Boolean).join(" · ") || "—"}</div>
              <div className="flex gap-2">
                <button className="cursor-pointer rounded border border-border px-2 py-1" onClick={() => { setEditId(i.id); setF({ tournamentName: i.tournamentName, winnerTeam: i.winnerTeam, dateLabel: i.dateLabel, organizer: i.organizer, youtubeUrl: i.youtubeUrl }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                <button className="cursor-pointer rounded border border-border px-2 py-1" onClick={async () => { await updateShowcase(i.id, { active: !i.active }); load(); }}>{i.active ? "Hide" : "Show"}</button>
                <button className="cursor-pointer rounded border border-red-500/50 px-2 py-1 text-red-400" onClick={async () => { if (confirm("Delete this entry?")) { await deleteShowcase(i.id); load(); } }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
