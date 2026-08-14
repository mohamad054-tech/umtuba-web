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
    <section
      id={id}
      className="mt-12 md:mt-16"
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
        <div className="min-w-0 max-w-2xl">
          {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
          <h2
            id={id ? `${id}-heading` : undefined}
            className="sf-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="sf-btn sf-btn-ghost shrink-0"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
