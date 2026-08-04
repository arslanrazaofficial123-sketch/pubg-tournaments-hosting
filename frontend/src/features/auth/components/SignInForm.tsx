"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { isLoggedIn as checkLoggedIn, setSession } from "@/lib/auth";
import { isIntegerOnly, sanitizeIntegerInput } from "@/lib/validation";
import { ApiError, loginAccount } from "@/services/api";
import type { SignInFormData } from "@/types/auth";
import { AuthFormLayout } from "./AuthFormLayout";

const INITIAL_FORM: SignInFormData = {
  uid: "",
  password: "",
  inGameName: "",
};

type FormErrors = Partial<Record<keyof SignInFormData, string>>;

interface SignInFormProps {
  onSuccess?: () => void;
  onToggleView?: () => void;
  isModal?: boolean;
}

export function SignInForm({ onSuccess, onToggleView, isModal = false }: SignInFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<SignInFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!onSuccess && checkLoggedIn()) {
      router.replace("/dashboard");
    }
  }, [router, onSuccess]);

  const updateField = (field: keyof SignInFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.uid.trim()) {
      nextErrors.uid = "UID is required";
    } else if (!isIntegerOnly(form.uid)) {
      nextErrors.uid = "UID must contain integers only";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const user = await loginAccount({
        uid: form.uid.trim(),
        password: "",
        inGameName: form.inGameName?.trim(),
      });

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
        setSubmitError("Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Link Player UID"
      subtitle="Enter your PUBG Mobile UID to access the tournament portal"
      footerText=""
      footerLinkText=""
      footerLinkHref=""
      isModal={isModal}
      onFooterLinkClick={undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Unique ID (UID) *"
          name="uid"
          inputMode="numeric"
          autoComplete="username"
          placeholder="Enter your PUBG UID"
          value={form.uid}
          onChange={(event) =>
            updateField("uid", sanitizeIntegerInput(event.target.value))
          }
          error={errors.uid}
        />

        <Input
          label="Player Name (Optional)"
          name="inGameName"
          placeholder="Enter your PUBG in-game name"
          value={form.inGameName || ""}
          onChange={(event) =>
            updateField("inGameName", event.target.value)
          }
        />

        {submitError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? "Linking account..." : "Link UID"}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
