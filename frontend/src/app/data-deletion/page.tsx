"use client";

import { useState } from "react";
import { ContentPage } from "@/components/layout/ContentPage";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertProvider";
import { apiClient } from "@/services/api/client";
import { CheckCircle, Loader2 } from "lucide-react";

export default function DataDeletionPage() {
  const { showAlert } = useAlert();
  const [fullName, setFullName] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [whatsappOrPhone, setWhatsappOrPhone] = useState("");
  const [teamName, setTeamName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showAlert("Full name is required", "error");
      return;
    }
    if (!emailOrUsername.trim()) {
      showAlert("Email or username is required", "error");
      return;
    }
    if (!whatsappOrPhone.trim()) {
      showAlert("WhatsApp or phone number is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient<{
        success: boolean;
        message: string;
        request: { id: string; status: string };
      }>("/data-deletion", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          emailOrUsername: emailOrUsername.trim(),
          whatsappOrPhone: whatsappOrPhone.trim(),
          teamName: teamName.trim(),
          reason: reason.trim(),
        }),
      });
      setRequestId(result.request.id);
      setSubmitted(true);
      showAlert("Deletion request submitted successfully!", "success");
    } catch (err: any) {
      showAlert(err.message || "Failed to submit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ContentPage
        heading="Account & Data Deletion"
        description="Request deletion of your EPIX Esports account and associated personal data."
      >
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-2xl border border-emerald-600/30 bg-emerald-600/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              Request Submitted
            </h2>
            <p className="mt-2 text-sm text-text-primary/70">
              Your data deletion request has been received.
            </p>
            {requestId && (
              <p className="mt-3 text-xs text-text-primary/50">
                Reference ID:{" "}
                <span className="font-mono font-semibold text-accent">
                  {requestId}
                </span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-bg-secondary p-6">
            <h3 className="mb-3 text-lg font-bold text-text-primary">
              What Happens Next
            </h3>
            <ul className="space-y-3 text-sm text-text-primary/70">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                  1
                </span>
                <span>
                  Our support team will contact you for account ownership
                  verification.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                  2
                </span>
                <span>
                  After verification, the account is disabled and the
                  deletion/anonymization process starts.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                  3
                </span>
                <span>
                  We aim to process verified deletion requests within 24-48
                  hours and send confirmation when complete.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-bg-secondary p-6">
            <h3 className="mb-3 text-lg font-bold text-text-primary">
              Contact Us
            </h3>
            <p className="text-sm text-text-primary/70">
              You can also contact us at{" "}
              <a
                href="mailto:arslanrazaofficial123@gmail.com"
                className="font-semibold text-accent hover:underline"
              >
                arslanrazaofficial123@gmail.com
              </a>{" "}
              or{" "}
              <a
                href="https://wa.me/923269546755"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent hover:underline"
              >
                +92 326 9546755
              </a>
              .
            </p>
          </div>
        </div>
      </ContentPage>
    );
  }

  return (
    <ContentPage
      heading="Account & Data Deletion"
      description="Request deletion of your EPIX Esports account and associated personal data. Login is not required."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Info box */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6">
          <p className="text-sm leading-relaxed text-text-primary/70">
            Use this public form to request deletion of your EPIX Esports
            account and associated personal data. After verification, we remove
            or anonymize account profile data, team/member records, uploaded
            photos, payment proof references, wallet request identifiers, and
            app/device tokens where applicable.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text-primary/70">
            Some tournament results, leaderboard history, transaction audit
            records, fraud-prevention records, or legal/compliance records may
            be retained in anonymized or limited form where required.
          </p>
        </div>

        {/* Deletion request form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-bg-secondary p-6"
        >
          <h2 className="mb-5 text-lg font-bold text-text-primary">
            Submit Request
          </h2>
          <div className="space-y-4">
            <Input
              label="Full Name *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
            <Input
              label="Email / Username *"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Enter your email or username"
              required
            />
            <Input
              label="WhatsApp / Phone *"
              value={whatsappOrPhone}
              onChange={(e) => setWhatsappOrPhone(e.target.value)}
              placeholder="Enter your WhatsApp or phone number"
              required
            />
            <Input
              label="Team Name (optional)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Reason (optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us why you want to delete your account..."
                className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/30 focus:border-accent focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Deletion Request"
              )}
            </Button>
          </div>
        </form>

        {/* What happens next */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6">
          <h3 className="mb-3 text-lg font-bold text-text-primary">
            What Happens Next
          </h3>
          <ul className="space-y-3 text-sm text-text-primary/70">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                1
              </span>
              <span>
                Our support team will contact you for account ownership
                verification.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                2
              </span>
              <span>
                After verification, the account is disabled and the
                deletion/anonymization process starts.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                3
              </span>
              <span>
                We aim to process verified deletion requests within 24-48
                hours and send confirmation when complete.
              </span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6">
          <h3 className="mb-3 text-lg font-bold text-text-primary">
            Contact Us
          </h3>
          <p className="text-sm text-text-primary/70">
            You can also contact us at{" "}
            <a
              href="mailto:arslanrazaofficial123@gmail.com"
              className="font-semibold text-accent hover:underline"
            >
              arslanrazaofficial123@gmail.com
            </a>{" "}
            or{" "}
            <a
              href="https://wa.me/923269546755"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:underline"
            >
              +92 326 9546755
            </a>
            .
          </p>
        </div>
      </div>
    </ContentPage>
  );
}
