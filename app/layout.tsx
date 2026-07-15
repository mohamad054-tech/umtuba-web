import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { buildRootMetadata } from "../lib/site/metadata";
import AppChrome from "./components/AppChrome";
import AppMotionRoot from "./components/motion/AppMotionRoot";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppMotionRoot>
          <AppChrome>{children}</AppChrome>
        </AppMotionRoot>
      </body>
    </html>
  );
}
