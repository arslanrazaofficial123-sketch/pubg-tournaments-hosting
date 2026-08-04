"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { isLoggedIn as checkLoggedIn, setSession } from "@/lib/auth";
import {
  isIntegerOnly,
  sanitizeIntegerInput,
  validatePassword,
} from "@/lib/validation";
import { ApiError, lookupPlayerByUid, registerAccount } from "@/services/api";
import type { SignUpFormData } from "@/types/auth";
import { AuthFormLayout } from "./AuthFormLayout";

const INITIAL_FORM: SignUpFormData = {
  uid: "",
  inGameName: "",
  whatsapp: "",
  password: "",
  recoveryPassword: "",
};

const MIN_UID_LENGTH = 6;
const UID_LOOKUP_DEBOUNCE_MS = 600;

type FormErrors = Partial<Record<keyof SignUpFormData, string>>;
type NameLookupStatus = "idle" | "loading" | "found" | "failed";

interface SignUpFormProps {
  onSuccess?: () => void;
  onToggleView?: () => void;
  isModal?: boolean;
}

export function SignUpForm({ onSuccess, onToggleView, isModal = false }: SignUpFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<SignUpFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!onSuccess && checkLoggedIn()) {
      router.replace("/dashboard");
    }
  }, [router, onSuccess]);

  const updateField = (field: keyof SignUpFormData, value: string) => {
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

    if (!form.inGameName.trim()) {
      nextErrors.inGameName = "In-Game Name is required";
    }

    if (!form.whatsapp.trim()) {
      nextErrors.whatsapp = "WhatsApp number is required";
    } else if (!isIntegerOnly(form.whatsapp)) {
      nextErrors.whatsapp = "WhatsApp number must contain integers only";
    }

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }

    const recoveryError = validatePassword(form.recoveryPassword);
    if (recoveryError) {
      nextErrors.recoveryPassword =
        "Recovery password must be at least 8 characters";
    } else if (form.password && form.recoveryPassword && form.password === form.recoveryPassword) {
      nextErrors.recoveryPassword = "Recovery password cannot be the same as password";
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
      const user = await registerAccount({
        uid: form.uid.trim(),
        inGameName: form.inGameName.trim(),
        whatsapp: form.whatsapp.trim(),
        password: form.password,
        recoveryPassword: form.recoveryPassword,
      });

      setSession(user);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const msg = error.message.toLowerCase();
        if (msg.includes("whatsapp")) {
          setErrors({ whatsapp: error.message });
        } else if (msg.includes("in-game name") || msg.includes("ingamename")) {
          setErrors({ inGameName: error.message });
        } else {
          setErrors({ uid: error.message });
        }
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Create Account"
      subtitle="Register to join PUBG Mobile tournaments"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/sign-in"
      isModal={isModal}
      onFooterLinkClick={onToggleView}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Unique ID (UID)"
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
          label="In-Game Name"
          name="inGameName"
          autoComplete="nickname"
          placeholder="Enter your in-game name"
          value={form.inGameName}
          onChange={(event) => updateField("inGameName", event.target.value)}
          error={errors.inGameName}
        />

        <Input
          label="WhatsApp Number"
          name="whatsapp"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="923001234567"
          value={form.whatsapp}
          onChange={(event) =>
            updateField("whatsapp", sanitizeIntegerInput(event.target.value))
          }
          error={errors.whatsapp}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          error={errors.password}
        />

        <Input
          label="Recovery Password"
          name="recoveryPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          value={form.recoveryPassword}
          onChange={(event) =>
            updateField("recoveryPassword", event.target.value)
          }
          error={errors.recoveryPassword}
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
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
