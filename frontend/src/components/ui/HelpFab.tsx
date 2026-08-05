import { MessageCircle, Phone } from "lucide-react";

export function HelpFab() {
  return (
    <a
      href="https://wa.me/923269546755"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact support on WhatsApp"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent text-bg-primary shadow-lg shadow-accent/25 transition-transform hover:scale-110"
    >
      <div className="relative flex items-center justify-center h-full w-full">
        {/* Round Chat Bubble Icon */}
        <MessageCircle strokeWidth={2} className="absolute w-6.5 h-6.5 sm:w-[30px] sm:h-[30px]" />
        {/* Phone Handset Icon inside */}
        <Phone strokeWidth={2.5} className="absolute w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] translate-y-[-0.5px] sm:translate-y-[-1px]" />
      </div>
    </a>
  );
}
