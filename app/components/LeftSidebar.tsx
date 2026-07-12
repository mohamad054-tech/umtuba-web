"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    label: "🔥 For You",
    href: "/feed",
  },
  {
    label: "👥 Following",
    href: "/feed?tab=following",
  },
  {
    label: "🔴 Live",
    href: "/live",
  },
  {
    label: "🤖 AI",
    href: "/ai",
  },
  {
    label: "💡 Ideas",
    href: "/ideas",
  },
  {
    label: "🚀 Opportunities",
    href: "/opportunities",
  },
  {
    label: "🌍 Post Journey",
    href: "/post-journey",
  },
  {
    label: "🤝 UConnect",
    href: "/uconnect",
  },
];

export default function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block">
      <div className="sticky top-28 space-y-3">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
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