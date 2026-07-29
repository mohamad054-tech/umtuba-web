import Link from "next/link";

type StoreEmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function StoreEmptyState({
  title,
  description,
  actionHref,
  actionLabel = "Continue",
}: StoreEmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-[var(--sf-radius)] border border-dashed border-[var(--sf-line)] bg-[rgba(214,196,161,0.04)] px-5 py-12 text-center"
    >
      <p className="sf-display text-base font-semibold tracking-tight text-[var(--sf-ink)]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--sf-muted)]">
        {description}
      </p>
      {actionHref ? (
        <Link
          href={actionHref}
          className="watch-focus-ring mt-5 inline-flex rounded-full border border-[rgba(214,196,161,0.35)] bg-[rgba(214,196,161,0.1)] px-4 py-2 text-xs font-semibold text-[var(--sf-accent-strong)] transition hover:bg-[rgba(214,196,161,0.18)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
