"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_ROUTES } from "../lib/nav";

/** Only routes that exist today — no future product placeholders. */
const items = [
  {
    label: "For You",
    href: APP_ROUTES.discover,
  },
  {
    label: "Live",
    href: APP_ROUTES.live,
  },
  {
    label: "Post Journey",
    href: APP_ROUTES.postJourney,
  },
  {
    label: "Messages",
    href: APP_ROUTES.messages,
  },
] as const;

function isSidebarActive(pathname: string, href: string): boolean {
  if (href === APP_ROUTES.discover) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === APP_ROUTES.live) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block">
      <div className="sticky top-28 space-y-3">
        {items.map((item) => {
          const isActive = isSidebarActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`block w-full rounded-2xl px-5 py-4 font-bold transition ${
                isActive
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
