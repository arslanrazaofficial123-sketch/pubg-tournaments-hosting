import { cn } from "@/lib/utils";

interface CarouselControlsProps {
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

export function CarouselControls({
  onPrev,
  onNext,
  canScrollPrev,
  canScrollNext,
}: CarouselControlsProps) {
  return (
    <div className="flex shrink-0 gap-2">
      <CarouselButton
        direction="prev"
        onClick={onPrev}
        disabled={!canScrollPrev}
      />
      <CarouselButton
        direction="next"
        onClick={onNext}
        disabled={!canScrollNext}
      />
    </div>
  );
}

function CarouselButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-border transition-all",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:border-accent hover:bg-accent/10 hover:text-accent",
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={direction === "next" ? "rotate-180" : ""}
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}
