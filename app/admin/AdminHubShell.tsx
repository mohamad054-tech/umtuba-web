import type { ReactNode } from "react";
import AppTopNav from "../components/AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AdminHubShell({ title, subtitle, children }: Props) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={title} subtitle={subtitle} sticky />
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">{children}</div>
    </main>
  );
}
