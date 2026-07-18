import type { ReactNode } from "react";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import CartIconButton from "./CartIconButton";

type StoreShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export default function StoreShell({
  title,
  subtitle,
  actions,
  children,
  wide = true,
}: StoreShellProps) {
  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-18%] top-[-12%] h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-[-14%] top-[22%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[30%] h-[22rem] w-[22rem] rounded-full bg-indigo-600/15 blur-3xl" />
      </div>

      <div
        className={`relative z-10 mx-auto px-4 py-6 md:px-6 ${
          wide ? "max-w-7xl" : "max-w-3xl"
        }`}
      >
        <AppTopNav
          title={title}
          subtitle={subtitle}
          actions={
            <>
              {actions}
              <CartIconButton />
            </>
          }
        />
        {children}
      </div>
    </main>
  );
}
