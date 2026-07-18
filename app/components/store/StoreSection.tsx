import Link from "next/link";
import type { ReactNode } from "react";

type StoreSectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
};

export default function StoreSection({
  id,
  eyebrow,
  title,
  description,
  href,
  linkLabel = "See all",
  children,
}: StoreSectionProps) {
  return (
    <section id={id} className="mt-10 md:mt-14" aria-labelledby={id ? `${id}-heading` : undefined}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
              {eyebrow}
            </p>
          ) : null}
          <h2
            id={id ? `${id}-heading` : undefined}
            className="mt-1 text-xl font-black tracking-tight md:text-2xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-white/50">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="watch-focus-ring shrink-0 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-500/20"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
