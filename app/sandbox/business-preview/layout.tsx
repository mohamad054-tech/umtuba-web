import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Business preview sandbox | UMTUBA",
  robots: { index: false, follow: false },
};

export default function SandboxBusinessPreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
