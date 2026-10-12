"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/services/api";
import {
  getPublicTeam,
  getPublicTournament,
  submitPublicTeam,
  updatePublicTeam,
  type PublicTeam,
  type PublicTournament,
} from "@/services/api/production";
import {
  btnGhost,
  btnPrimary,
  Eyebrow,
  inputCls,
  Panel,
  ProductionShell,
  Spinner,
  useClientValue,
  useQueryParam,
} from "@/features/production/ProductionShell";
import { TeamForm } from "@/features/production/TeamForm";
import { formatPkt, timeLeft } from "@/features/production/utils";

const storeKey = (slug: string) => `epix_upload_edit_${slug}`;

function readSaved(slug: string): string {
  try {
    return localStorage.getItem(storeKey(slug)) || "";
  } catch {
    return "";
  }
}

function writeSaved(slug: string, token: string): void {
  try {
    localStorage.setItem(storeKey(slug), token);
  } catch {
    /* ignore */
  }
}

type View = "loading" | "invalid" | "form" | "done" | "edit";

export default function PublicUploadPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || "");
  const [tournament, setTournament] = useState<PublicTournament | null>(null);
  const [view, setView] = useState<View>("loading");
  const [editToken, setEditToken] = useState("");
  const storedToken = useClientValue<string>(() => readSaved(slug), "");
  const [newToken, setNewToken] = useState("");
  const savedToken = newToken || storedToken;
  const editParam = useQueryParam("edit");
  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [doneName, setDoneName] = useState("");
  const [doneMode, setDoneMode] = useState<"new" | "updated">("new");
  const [copied, setCopied] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = useCallback(
    async (token: string) => {
      setEditError("");
      try {
        const res = await getPublicTeam(slug, token);
        setTournament(res.tournament);
        setTeam(res.team);
        setEditToken(token);
        writeSaved(slug, token);
        setView("edit");
      } catch {
        setEditError("That edit link is not valid for this tournament.");
        setView("form");
      }
    },
    [slug],
  );

  useEffect(() => {
    if (!slug || editParam === null) return;
    getPublicTournament(slug)
      .then((t) => {
        setTournament(t);
        if (editParam) openEdit(editParam);
        else setView("form");
      })
      .catch(() => setView("invalid"));
  }, [slug, editParam, openEdit]);

  const editUrl = editToken && typeof window !== "undefined"
    ? `${window.location.origin}/p/${slug}?edit=${editToken}`
    : "";

  const copyEditLink = async () => {
    try {
      await navigator.clipboard.writeText(editUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user can copy manually */
    }
  };

  const shell = (children: React.ReactNode) => (
    <ProductionShell showLogout={false}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </ProductionShell>
  );

  if (view === "loading") return shell(<Spinner />);

  if (view === "invalid" || !tournament) {
    return shell(
      <Panel className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary">This upload link is not valid</h1>
        <p className="mt-2 text-sm text-text-primary/50">Ask the tournament organizer for the correct link.</p>
      </Panel>,
    );
  }

  const header = (
    <div className="mb-8">
      <Eyebrow>Team media upload</Eyebrow>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">{tournament.name}</h1>
      <p className="mt-3 text-sm text-text-primary/60">
        Send your team logo, and optionally each player&apos;s photo with their UID. No account needed.
      </p>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={`flex items-center gap-2 ${tournament.isOpen ? "text-accent" : "text-red-300"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tournament.isOpen ? "bg-accent" : "bg-red-400"}`} />
          {tournament.isOpen ? "Accepting uploads" : "Uploads are closed"}
        </span>
        {tournament.deadline && (
          <span className="text-text-primary/50">
            Deadline {formatPkt(tournament.deadline)} PKT{tournament.isOpen ? ` · ${timeLeft(tournament.deadline)}` : ""}
          </span>
        )}
      </p>
    </div>
  );

  if (view === "done") {
    return shell(
      <>
        {header}
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            ✓ {doneMode === "new" ? "Submitted successfully" : "Changes saved"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-text-primary">&quot;{doneName}&quot; is in.</h2>
          <p className="mt-4 text-sm text-text-primary/70">
            <strong className="text-text-primary">Save your private edit link.</strong> Use it to change your logo, name or
            players {tournament.deadline ? "until the deadline" : "while uploads are open"}. Don&apos;t share it outside your team.
          </p>
          <input readOnly value={editUrl} onFocus={(e) => e.target.select()} className={`${inputCls} mt-4 font-mono text-xs`} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={copyEditLink} className={btnPrimary}>
              {copied ? "Copied ✓" : "Copy edit link"}
            </button>
            <button type="button" onClick={() => openEdit(editToken)} className={btnGhost}>
              Edit submission
            </button>
          </div>
        </div>
      </>,
    );
  }

  if (view === "edit" && team) {
    return shell(
      <>
        {header}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary/60 px-4 py-3 text-sm">
          <span className="text-text-primary/70">
            Editing <strong className="text-text-primary">{team.teamName}</strong>
          </span>
          <button type="button" onClick={copyEditLink} className="cursor-pointer text-xs font-semibold text-accent">
            {copied ? "Copied ✓" : "Copy edit link"}
          </button>
        </div>
        <TeamForm
          key={`edit-${team.updatedAt}`}
          initial={team}
          maxPlayers={tournament.maxPlayers}
          disabled={!tournament.isOpen}
          submitLabel="Save changes →"
          onSubmit={async (payload) => {
            try {
              const res = await updatePublicTeam(slug, editToken, payload);
              if (res.team) setTeam(res.team);
              setDoneName(payload.teamName);
              setDoneMode("updated");
              setView("done");
            } catch (err) {
              throw new Error(err instanceof ApiError ? err.message : "Could not save changes.");
            }
          }}
        />
      </>,
    );
  }

  return shell(
    <>
      {header}
      {savedToken && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          <span className="text-text-primary/70">You already submitted a team from this device.</span>
          <button type="button" onClick={() => openEdit(savedToken)} className="cursor-pointer text-sm font-semibold text-accent">
            Edit your submission →
          </button>
        </div>
      )}
      {editError && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{editError}</p>
      )}
      {tournament.isOpen ? (
        <TeamForm
          maxPlayers={tournament.maxPlayers}
          submitLabel="Submit team →"
          busyLabel="Uploading... please keep this page open"
          onSubmit={async (payload) => {
            try {
              const res = await submitPublicTeam(slug, payload);
              writeSaved(slug, res.editToken);
              setNewToken(res.editToken);
              setEditToken(res.editToken);
              setDoneName(res.teamName);
              setDoneMode("new");
              setView("done");
            } catch (err) {
              throw new Error(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
            }
          }}
        />
      ) : (
        <Panel className="text-center">
          <h2 className="text-xl font-semibold text-text-primary">Uploads are closed</h2>
          <p className="mt-2 text-sm text-text-primary/50">Contact the tournament organizer if you still need to send your team media.</p>
        </Panel>
      )}
    </>,
  );
}
