"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn as checkLoggedIn, setSession } from "@/lib/auth";
import { ApiError, googleSignIn, loginAccount } from "@/services/api";
import { AuthFormLayout } from "./AuthFormLayout";
import { GoogleSignInButton } from "./GoogleSignInButton";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface SignInFormProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export function SignInForm({ onSuccess, isModal = false }: SignInFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!onSuccess && checkLoggedIn()) {
      router.replace("/dashboard");
    }
  }, [router, onSuccess]);

  const handleGoogleSuccess = async (credential: string) => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const user = await googleSignIn(credential);
      setSession(user);
      onSuccess?.();
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Google sign-in failed. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!uid.trim()) {
      setSubmitError("UID is required.");
      return;
    }
    if (!password) {
      setSubmitError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await loginAccount({ uid: uid.trim(), password });
      setSession(user);
      onSuccess?.();
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Login failed. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Login"
      subtitle="Welcome back! Sign in to continue"
      footerText=""
      footerLinkText=""
      footerLinkHref=""
      isModal={isModal}
      onFooterLinkClick={undefined}
    >
      {GOOGLE_CLIENT_ID && (
        <div className="mb-4">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 mb-4 text-center">
            <p className="text-xs font-semibold text-accent">Quick &amp; Secure Login with Google</p>
          </div>
          <GoogleSignInButton
            clientId={GOOGLE_CLIENT_ID}
            onSuccess={handleGoogleSuccess}
            onError={(message) => setSubmitError(message)}
          />
        </div>
      )}

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-bg-secondary/80 px-3 text-text-primary/40 font-semibold tracking-wider">
            or
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
            UID
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter your PUBG UID"
            value={uid}
            onChange={(e) => { setUid(e.target.value); setSubmitError(""); }}
            className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent font-mono placeholder:text-text-primary/25"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setSubmitError(""); }}
              className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent font-mono placeholder:text-text-primary/25"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary/40 hover:text-text-primary/70 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {submitError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-text-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Signing in..." : "Login with UID"}
        </button>
      </form>

      {!isModal && (
        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-xs text-text-primary/50 hover:text-accent transition-colors font-semibold"
          >
            &larr; Back to Home
          </Link>
        </div>
      )}
    </AuthFormLayout>
  );
}
