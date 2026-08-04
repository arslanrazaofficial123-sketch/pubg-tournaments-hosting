import Image from "next/image";
import Link from "next/link";

interface AuthFormLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
  isModal?: boolean;
  onFooterLinkClick?: (e: React.MouseEvent) => void;
}

export function AuthFormLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
  isModal = false,
  onFooterLinkClick,
}: AuthFormLayoutProps) {
  if (isModal) {
    return (
      <div className="w-full max-w-md mx-auto p-3 sm:p-6">
        <div className="mb-3.5 sm:mb-6 flex flex-col items-center text-center">
          <div className="relative h-10 w-10 mb-1.5 sm:h-20 sm:w-20">
            <Image
              src="/images/logo.png"
              alt="EPIX Esports"
              fill
              priority
              sizes="(max-width: 640px) 40px, 80px"
              className="object-contain"
            />
          </div>
          <h1 className="text-base font-bold text-text-primary sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 text-[10px] sm:text-sm text-text-primary/60">{subtitle}</p>
        </div>

        <div className="space-y-3.5">
          {children}
        </div>

        <p className="mt-4 text-center text-xs sm:text-sm text-text-primary/60">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            onClick={(e) => {
              if (onFooterLinkClick) {
                e.preventDefault();
                onFooterLinkClick(e);
              }
            }}
            className="font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            {footerLinkText}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-3 py-6 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-4 sm:mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-3 sm:mb-6 transition-opacity hover:opacity-90">
            <div className="relative h-16 w-16 sm:h-40 sm:w-40">
              <Image
                src="/images/logo.png"
                alt="EPIX Esports"
                fill
                priority
                sizes="(max-width: 640px) 64px, 160px"
                className="object-contain"
              />
            </div>
          </Link>
          <h1 className="text-lg font-bold text-text-primary sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-text-primary/60">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary/80 p-4 shadow-xl backdrop-blur-sm sm:p-8">
          {children}
        </div>

        <p className="mt-4 text-center text-xs sm:text-sm text-text-primary/60">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            onClick={(e) => {
              if (onFooterLinkClick) {
                e.preventDefault();
                onFooterLinkClick(e);
              }
            }}
            className="font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
}

