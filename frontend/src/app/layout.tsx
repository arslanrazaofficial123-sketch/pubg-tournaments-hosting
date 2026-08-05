import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { AlertProvider } from "@/components/ui";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ActivityTrackerInitializer from "@/components/ActivityTrackerInitializer";
import { ErrorMonitor } from "@/components/ErrorMonitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EPIX Esports",
  description:
    "Your hub for PUBG Mobile tournaments — upcoming events, live matches, and past results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col antialiased" suppressHydrationWarning>
        <AlertProvider>
          <ErrorMonitor />
          <ErrorBoundary>
            <ActivityTrackerInitializer />
            <main className="flex-1">{children}</main>
            <Footer />
          </ErrorBoundary>
        </AlertProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
