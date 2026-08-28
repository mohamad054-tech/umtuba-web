import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { buildSiteGraphJsonLd } from "../lib/site/jsonLd";
import { buildRootMetadata } from "../lib/site/metadata";
import { resolveRequestLocale } from "../lib/i18n/server";
import AppChrome from "./components/AppChrome";
import BrandJsonLd from "./components/brand/BrandJsonLd";
import JsonLd from "./components/JsonLd";
import { I18nProvider } from "./components/i18n";
import AppMotionRoot from "./components/motion/AppMotionRoot";
import ExactContextResume from "./components/world/ExactContextResume";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = buildRootMetadata();

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, direction } = await resolveRequestLocale();

  return (
    // suppressHydrationWarning: browser translation / extensions often mutate
    // <html lang|dir> before React hydrates.
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full min-h-dvh flex-col bg-[#050510]" suppressHydrationWarning>
        <JsonLd data={buildSiteGraphJsonLd()} />
        <BrandJsonLd />
        <I18nProvider locale={locale}>
          <AppMotionRoot>
            <ExactContextResume />
            <AppChrome>{children}</AppChrome>
          </AppMotionRoot>
        </I18nProvider>
      </body>
    </html>
  );
}
