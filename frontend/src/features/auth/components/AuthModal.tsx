"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "signin" | "signup";
}

export function AuthModal({
  isOpen,
  onClose,
  initialView = "signin",
}: AuthModalProps) {
  const [view, setView] = useState<"signin" | "signup">(initialView);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={view === "signin" ? "Sign In" : "Sign Up"}
      width={480}
      hideHeader
    >
      <div className="relative">
        {/* Close button at the top-right corner of the modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg text-text-primary/60 transition-colors hover:bg-bg-primary hover:text-accent"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <SignInForm
          isModal
          onSuccess={onClose}
          onToggleView={undefined}
        />
      </div>
    </Modal>
  );
}
