"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  status?: React.ReactNode;
  width?: number;
  hideHeader?: boolean;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  status,
  width = 672,
  hideHeader = false,
  children,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-bg-primary/85 backdrop-blur-md" />

      <div
        style={{ width: `min(${width}px, calc(100vw - 1.5rem))` }}
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl sm:rounded-2xl",
          "border border-border bg-bg-secondary shadow-2xl shadow-accent/15",
        )}
      >
        {!hideHeader && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <div className="min-w-0 space-y-1">
              {status}
              <h2
                id="modal-title"
                className="line-clamp-2 text-sm sm:text-lg font-semibold text-text-primary"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary/60 transition-colors hover:bg-bg-primary hover:text-accent"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto modal-scrollbar">{children}</div>
      </div>
    </div>
  );
}
