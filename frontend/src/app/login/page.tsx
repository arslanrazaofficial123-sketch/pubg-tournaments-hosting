"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { SignInForm } from "@/features/auth";
import { warmUpApi } from "@/services/api";

export default function LoginPage() {
  // Boot the API + database while the visitor is still typing, so sign-in is instant.
  useEffect(() => {
    warmUpApi();
  }, []);

  return (
    <PageShell showHelpFab={false}>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <SignInForm />
        </div>
      </div>
    </PageShell>
  );
}
