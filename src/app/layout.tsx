import type { Metadata } from "next";
// `geist` ships the font files with the package — no Google Fonts fetch at build
// time, so container / offline builds work.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsent } from "@/components/common/cookie-consent";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "JobHunt — Know which tech jobs are worth applying to",
    template: "%s · JobHunt",
  },
  description:
    "AI-powered job matching, CV tailoring, cover letters, interview prep and application tracking for software, DevOps, cloud, SRE, data, security and QA engineers in the US and UK.",
  applicationName: "JobHunt",
  keywords: [
    "AI job search",
    "AI job matching",
    "resume tailoring",
    "remote tech jobs",
    "DevOps jobs",
    "cloud engineer jobs",
    "US tech jobs",
    "UK tech jobs",
  ],
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "JobHunt",
    title: "JobHunt — Know which tech jobs are worth applying to",
    description:
      "Stop applying blindly. JobHunt scores every job against your real skills, experience and work eligibility, then tells you whether to apply.",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobHunt — Know which tech jobs are worth applying to",
    description:
      "AI job matching, CV tailoring and interview prep for ambitious tech professionals in the US and UK.",
  },
  robots: { index: true, follow: true },
};

const themeScript = `
try {
  var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var s = localStorage.getItem('theme');
  if (s === 'dark' || (!s && m)) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen antialiased`}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
        <CookieConsent />
      </body>
    </html>
  );
}
