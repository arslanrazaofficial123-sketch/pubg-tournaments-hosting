"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearProductionToken, productionToken } from "@/services/api/production";

/** Redirects to the Production Desk login when there is no session. Returns true once allowed. */
const noopSubscribe = () => () => {};

/** Reads a browser-only value (URL, storage) without a setState-in-effect round trip. */
export function useClientValue<T extends string | boolean | null>(get: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, get, () => serverValue);
}

export function useQueryParam(name: string): string | null {
  return useClientValue<string | null>(() => new URLSearchParams(window.location.search).get(name) || "", null);
}

export function useProductionGuard(): boolean {
  const router = useRouter();
  const hasToken = useClientValue<boolean | null>(() => !!productionToken(), null);
  useEffect(() => {
    if (hasToken === false) router.replace("/production");
  }, [hasToken, router]);
  return hasToken === true;
}

export function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{children}</p>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-bg-secondary/60 p-5 sm:p-7 ${className}`}>
      {children}
    </section>
  );
}

export const btnPrimary =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-bg-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-bg-primary/60 px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";
export const inputCls =
  "w-full rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-primary/30 focus:border-accent focus:outline-none";
export const linkCls =
  "cursor-pointer text-xs font-semibold text-accent underline underline-offset-4 hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

export function ProductionShell({
  children,
  showLogout = true,
}: {
  children: React.ReactNode;
  showLogout?: boolean;
}) {
  const router = useRouter();
  const logout = () => {
    clearProductionToken();
    router.replace("/production");
  };
  return (
    <div className="min-h-screen bg-bg-primary bg-[radial-gradient(ellipse_at_top_left,rgba(31,174,233,0.08),transparent_55%)]">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href={showLogout ? "/production/desk" : "/"} className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/60 text-sm font-black text-accent">
              E
            </span>
            <span className="text-lg font-black tracking-wide text-text-primary">EPIX</span>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-text-primary/50 sm:block">
              Production
            </span>
          </Link>
          {showLogout && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-primary/60 sm:inline">Production Desk</span>
              <button type="button" onClick={logout} className={`${btnGhost} px-4 py-2`}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">{children}</div>
    </div>
  );
}

export function PageHeading({ title, back }: { title: string; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Organizer workspace</Eyebrow>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-text-primary/60">
            One link for your teams. Every logo, photo and UID in one place.
          </p>
        </div>
        <span className="rounded-md border border-accent/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
          Media collection
        </span>
      </div>
      {back && (
        <Link href={back.href} className="mt-6 inline-block text-sm text-text-primary/60 hover:text-accent">
          ← {back.label}
        </Link>
      )}
    </div>
  );
}
