import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { buildRootMetadata } from "../lib/site/metadata";
import AppChrome from "./components/AppChrome";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: browser translation / extensions often mutate
    // <html lang> (e.g. en → ar) before React hydrates. Our lang is always "en".
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#050510] text-[#ededed] antialiased`}
    >
      <body
        className="flex min-h-full flex-col bg-[#050510] text-[#ededed]"
        suppressHydrationWarning
      >
        <AppMotionRoot>
          <ExactContextResume />
          <AppChrome>{children}</AppChrome>
        </AppMotionRoot>
      </body>
    </html>
  );
}
