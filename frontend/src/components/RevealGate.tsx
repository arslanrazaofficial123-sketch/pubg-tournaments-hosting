"use client";

import { useEffect, useState } from "react";
import { fetchMatches, getServerOffset } from "@/services/api/matches";

const COUNTDOWN_FROM_MS = 2 * 60 * 1000;

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Shown instead of the room ID/password while a match is locked.
 * More than 2 minutes before reveal: a quiet "reveals at" note. In the last 2 minutes: a live timer.
 * At 0 it keeps asking the server until the ID arrives, then refreshes the page.
 */
export function RevealGate({ revealAt, tournamentId, matchId }: { revealAt: string; tournamentId: string; matchId: string }) {
  const target = new Date(revealAt).getTime();
  const [left, setLeft] = useState(() => target - (Date.now() + getServerOffset()));

  useEffect(() => {
    const t = setInterval(() => setLeft(target - (Date.now() + getServerOffset())), 200);
    return () => clearInterval(t);
  }, [target]);

  useEffect(() => {
    if (left > 0) return;
    let stop = false;
    const poll = async () => {
      if (stop) return;
      const list = await fetchMatches(tournamentId);
      const m = list.find((x) => x.id === matchId);
      if (m && !m.locked && m.roomId) { window.location.reload(); return; }
      setTimeout(poll, 700);
    };
    poll();
    return () => { stop = true; };
  }, [left <= 0, tournamentId, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = new Date(target).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
  const lock = (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  );

  if (left > COUNTDOWN_FROM_MS) {
    return (
      <div className="col-span-2 mt-1">
        <span className="inline-flex items-center gap-1.5 rounded border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
          {lock} Room ID &amp; password reveal at {at} PKT
        </span>
      </div>
    );
  }

  return (
    <div className="col-span-2 mt-1 flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
      <span className="text-yellow-400">{lock}</span>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-yellow-400/80">
          {left > 0 ? "Room ID & password in" : "Revealing…"}
        </div>
        <div className="font-mono text-2xl font-extrabold leading-none text-yellow-300">{left > 0 ? fmt(left) : "00:00"}</div>
      </div>
    </div>
  );
}
