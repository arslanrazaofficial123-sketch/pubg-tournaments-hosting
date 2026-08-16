"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn as checkLoggedIn, setSession } from "@/lib/auth";
import { ApiError, googleSignIn } from "@/services/api";
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
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Google sign-in failed. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Sign in with Google"
      subtitle="Sign in to link your PUBG Mobile UID and access the tournament portal"
      footerText=""
      footerLinkText=""
      footerLinkHref=""
      isModal={isModal}
      onFooterLinkClick={undefined}
    >
      {GOOGLE_CLIENT_ID && (
        <div className="mb-5 space-y-4">
          <GoogleSignInButton
            clientId={GOOGLE_CLIENT_ID}
            onSuccess={handleGoogleSuccess}
            onError={(message) => setSubmitError(message)}
          />
        </div>
      )}

      {submitError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </p>
      )}
    </AuthFormLayout>
  );
}