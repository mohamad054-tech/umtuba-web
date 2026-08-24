import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";

type BecomeASellerHookProps = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  compact?: boolean;
};

export default function BecomeASellerHook({
  eyebrow,
  title,
  body,
  cta,
  compact = false,
}: BecomeASellerHookProps) {
  return (
    <section
      data-testid="become-a-seller-hook"
      className={`rounded-[28px] border border-[var(--sf-line,rgba(255,255,255,0.12))] bg-[var(--sf-surface,rgba(255,255,255,0.04))] ${
        compact ? "p-5 md:p-6" : "p-6 md:p-8"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--sf-faint,#94a3b8)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--sf-ink,#fff)] md:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--sf-muted,#cbd5e1)]">
        {body}
      </p>
      <Link
        href={APP_ROUTES.sellerSetup}
        className="watch-focus-ring mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#6a4cff,#2f7bff)] px-5 py-2.5 text-sm font-black text-white"
      >
        {cta}
      </Link>
    </section>
  );
}
