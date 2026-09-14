import type { Metadata } from "next";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import "./visual-demo.css";

export const metadata: Metadata = {
  title: "UMTUBA Store visual demo",
  robots: { index: false, follow: false },
};

export default function VisualDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`umtuba-visual-demo ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}>
      {children}
    </div>
  );
}
