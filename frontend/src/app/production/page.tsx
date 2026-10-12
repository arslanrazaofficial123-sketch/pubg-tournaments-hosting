"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/services/api";
import {
  productionLogin,
  productionToken,
  setProductionToken,
} from "@/services/api/production";

export default function ProductionLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (productionToken()) {
      router.replace("/production/desk");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await productionLogin(username.trim(), password);
      setProductionToken(res.token);
      router.push("/production/desk");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-secondary p-8 shadow-2xl shadow-accent/10">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            Organizer &amp; Crew Portal
          </span>
          <h1 className="text-2xl font-black uppercase tracking-wider text-text-primary">
            Production Desk
          </h1>
          <p className="mt-2 text-sm text-text-primary/60">
            Sign in to manage tournament teams and roster exports.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              autoComplete="username"
              className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign In to Production Workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-primary/40">
          EPIX PRODUCTION · Tournament teams, organized.
        </p>
      </div>
    </div>
  );
}
