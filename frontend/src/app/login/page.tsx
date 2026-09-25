"use client";

import { PageShell } from "@/components/layout/PageShell";
import { SignInForm } from "@/features/auth";

export default function LoginPage() {
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
