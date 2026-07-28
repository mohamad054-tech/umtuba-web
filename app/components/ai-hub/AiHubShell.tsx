import Link from "next/link";
import { AI_HUB_EXPERIENCE_ROUTES } from "../../../lib/ai/hub/experience";

type AiHubShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  active?: "home" | "assistant";
};

/**
 * Self-contained AI Hub shell — not the product App Shell / AppTopNav.
 */
export default function AiHubShell({
  title,
  subtitle,
  children,
  active = "home",
}: AiHubShellProps) {
  return (
    <main className="min-h-screen bg-[#0b1210] text-[#e8f0ea]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 md:px-6">
        <header className="border-b border-emerald-900/40 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/80">
            UMTUBA AI Hub
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#f3faf5]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-xl text-sm text-emerald-100/70">
              {subtitle}
            </p>
          ) : null}
          <nav
            aria-label="AI Hub"
            className="mt-4 flex flex-wrap gap-3 text-sm font-medium"
          >
            <Link
              href={AI_HUB_EXPERIENCE_ROUTES.home}
              className={
                active === "home"
                  ? "text-emerald-300 underline underline-offset-4"
                  : "text-emerald-100/60 hover:text-emerald-200"
              }
            >
              AI Home
            </Link>
            <Link
              href={AI_HUB_EXPERIENCE_ROUTES.assistant}
              className={
                active === "assistant"
                  ? "text-emerald-300 underline underline-offset-4"
                  : "text-emerald-100/60 hover:text-emerald-200"
              }
            >
              AI Assistant
            </Link>
          </nav>
        </header>
        <div className="flex-1 py-6">{children}</div>
        <footer className="border-t border-emerald-900/40 pt-4 text-xs text-emerald-100/50">
          Foundation experience — conversations, skills, and tools are not
          executed here.
        </footer>
      </div>
    </main>
  );
}
