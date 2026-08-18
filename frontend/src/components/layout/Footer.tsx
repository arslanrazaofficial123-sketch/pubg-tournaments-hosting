import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle } from "lucide-react";

const FOOTER_LINKS = [
  { label: "Tournaments", href: "/" },
  { label: "Player Reviews", href: "/reviews" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Rules & Terms", href: "/rules-terms" },
  { label: "Link UID", href: "/link-uid" },
  { label: "Shop", href: "/shop" },
  { label: "Order History", href: "/shop/history" },
  { label: "Request Data Deletion", href: "/data-deletion" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-bg-primary/50 p-1">
                <Image
                  src="/images/logo.png"
                  alt="EPIX Esports logo"
                  fill
                  sizes="44px"
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-black uppercase tracking-wider text-text-primary">
                EPIX Esports
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-primary/60">
              The official hub for PUBG Mobile tournaments — live matches, community
              battles, and real rewards.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://wa.me/923269546755"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact us on WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-bg-primary/50 text-text-primary/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
              >
                <MessageCircle className="h-4.5 w-4.5" strokeWidth={2} />
              </a>
              <a
                href="mailto:arslanrazaofficial123@gmail.com"
                aria-label="Email us"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-bg-primary/50 text-text-primary/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
              >
                <Mail className="h-4.5 w-4.5" strokeWidth={2} />
              </a>
              <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-bg-primary/50 px-3 text-xs font-semibold text-text-primary/70">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011 13.984 13.984 0 0012.012 0 .073.073 0 01.078.009c.12.099.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                </svg>
                epixesportn
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-[1.5px] text-text-primary">
              Quick Links
            </h5>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-primary/60 transition-all duration-200 hover:translate-x-0.5 hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-[1.5px] text-text-primary">
              Get In Touch
            </h5>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <span className="block text-xs font-semibold uppercase tracking-wider text-text-primary/40">
                  WhatsApp
                </span>
                <a
                  href="https://wa.me/923269546755"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-text-primary/80 transition-colors hover:text-accent"
                >
                  +92 326 9546755
                </a>
              </li>
              <li>
                <span className="block text-xs font-semibold uppercase tracking-wider text-text-primary/40">
                  Email
                </span>
                <a
                  href="mailto:arslanrazaofficial123@gmail.com"
                  className="break-all font-bold text-text-primary/80 transition-colors hover:text-accent"
                >
                  arslanrazaofficial123@gmail.com
                </a>
              </li>
              <li>
                <span className="block text-xs font-semibold uppercase tracking-wider text-text-primary/40">
                  Discord
                </span>
                <span className="font-bold text-text-primary/80">epixesportn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-sm text-text-primary/60">
            &copy; {new Date().getFullYear()} EPIX Esports. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
