import Link from "next/link";
import type { ReactNode } from "react";
import type { AppLocale } from "../../../lib/i18n";
import { SANDBOX_COMMERCIAL_MODEL } from "../../../lib/sandbox/fixtures/commercial";
import { SANDBOX_COURSES } from "../../../lib/sandbox/fixtures/courses";
import {
  PROSPECTIVE_COMMERCE_PARTNERS,
  PROSPECTIVE_LEARNING_PARTNERS,
} from "../../../lib/sandbox/fixtures/partners";
import { SANDBOX_INSTRUCTORS, SANDBOX_STUDENTS } from "../../../lib/sandbox/fixtures/people";
import {
  SANDBOX_STORE_ACTORS,
  SANDBOX_STORE_LISTINGS,
} from "../../../lib/sandbox/fixtures/store";
import {
  effectiveRights,
  emptyRights,
  RIGHTS_FLAGS,
  type ProspectivePartner,
} from "../../../lib/sandbox/fixtures/types";
import { sandboxT } from "../../../lib/sandbox/i18n";
import { parseSandboxSection, sandboxHref } from "../../../lib/sandbox/paths";
import SandboxDenied from "./SandboxDenied";
import SandboxShell from "./SandboxShell";
import LearningSandbox from "./learning/LearningSandbox";
import StoreExperience from "./store/StoreExperience";

function Card({
  title,
  children,
  href,
  action,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  action?: string;
}) {
  const body = (
    <>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-2 text-sm text-[var(--sx-muted)]">{children}</div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="sx-card block hover:border-[var(--sx-accent)]">
        {body}
        {action ? <p className="mt-3 text-xs text-[var(--sx-accent)]">{action}</p> : null}
      </Link>
    );
  }
  return <article className="sx-card">{body}</article>;
}

function RightsTable({ partner }: { partner: ProspectivePartner }) {
  const effective = effectiveRights(partner.rights);
  return (
    <div className="sx-card">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{partner.displayName}</h3>
        <span className="sx-badge">{partner.label}</span>
        <span className="sx-badge">{partner.partnerClaim}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{partner.notes}</p>
      <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
        {RIGHTS_FLAGS.map((flag) => (
          <li key={flag}>
            {flag}: {partner.rights[flag]} → {effective[flag] ? "ALLOW" : "DENY"}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--sx-faint)]">
        Integrations:{" "}
        {Object.entries(partner.integrations)
          .map(([mode, value]) => `${mode}=${value}`)
          .join(" · ")}
      </p>
    </div>
  );
}

function Hub({ locale }: { locale: AppLocale }) {
  return (
    <>
      <p className="text-sm text-[var(--sx-muted)]">{sandboxT(locale, "originalsDraft")}</p>
      <div className="sx-grid sx-grid-3 mt-4">
        <Card title={sandboxT(locale, "learning")} href={sandboxHref("learning")}>
          {SANDBOX_STUDENTS.length} {sandboxT(locale, "learningStudent")} ·{" "}
          {SANDBOX_INSTRUCTORS.length} {sandboxT(locale, "learningInstructor")} ·{" "}
          {SANDBOX_COURSES.length} {sandboxT(locale, "catalog")}
        </Card>
        <Card title={sandboxT(locale, "store")} href={sandboxHref("store")}>
          {SANDBOX_STORE_LISTINGS.length} {sandboxT(locale, "store")} ·{" "}
          {SANDBOX_STORE_ACTORS.length} {sandboxT(locale, "synthetic")}
        </Card>
        <Card title="PARTNERS / PROVIDERS" href={sandboxHref("rights")}>
          {PROSPECTIVE_LEARNING_PARTNERS.length} learning + {PROSPECTIVE_COMMERCE_PARTNERS.length}{" "}
          commerce prospective · REAL_PARTNERSHIPS_CLAIMED=0
        </Card>
      </div>
    </>
  );
}

function Commercial() {
  return (
    <>
      <h2 className="text-xl font-semibold">Commercial model preview</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{SANDBOX_COMMERCIAL_MODEL.disclaimer}</p>
      <div className="sx-grid mt-4">
        {SANDBOX_COMMERCIAL_MODEL.learning.map((row) => (
          <Card key={row.kind} title={row.kind}>
            UMTUBA {row.umtubaSharePercent ?? "n/a"}% · partner {row.partnerSharePercent ?? "n/a"}% ·{" "}
            {row.note}
          </Card>
        ))}
        {SANDBOX_COMMERCIAL_MODEL.store.map((row) => (
          <Card key={row.mode} title={row.mode}>
            UMTUBA {row.umtubaSharePercent}% · actor {row.actorSharePercent}% · {row.note}
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs">{SANDBOX_COMMERCIAL_MODEL.payouts.reason}</p>
    </>
  );
}

function Rights() {
  const owned = emptyRights({
    CATALOG_DISPLAY_ALLOWED: "ALLOW",
    IMAGE_USAGE_ALLOWED: "ALLOW",
    CONTENT_HOSTING_ALLOWED: "ALLOW",
    CHECKOUT_ALLOWED: "DENY",
    RESELL_ALLOWED: "DENY",
    AI_USAGE_ALLOWED: "ALLOW",
    CERTIFICATE_RIGHTS: "ALLOW",
  });
  const ownedEffective = effectiveRights(owned);
  return (
    <>
      <h2 className="text-xl font-semibold">Rights / legal visibility</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">UNKNOWN = DENY.</p>
      <article className="sx-card mt-4">
        <h3 className="font-semibold">UMTUBA Originals (owned draft)</h3>
        <ul className="mt-2 text-xs">
          {RIGHTS_FLAGS.map((flag) => (
            <li key={flag}>
              {flag}: {owned[flag]} → {ownedEffective[flag] ? "ALLOW" : "DENY"}
            </li>
          ))}
        </ul>
      </article>
      <div className="mt-4 space-y-3">
        {[...PROSPECTIVE_LEARNING_PARTNERS, ...PROSPECTIVE_COMMERCE_PARTNERS].map((partner) => (
          <RightsTable key={partner.id} partner={partner} />
        ))}
      </div>
    </>
  );
}

export default function SandboxView({
  locale,
  pathname,
  allowed,
  segments,
  catalogQuery,
}: {
  locale: AppLocale;
  pathname: string;
  allowed: boolean;
  segments?: string[];
  catalogQuery?: { q?: string; category?: string; sort?: string };
}) {
  if (!allowed) {
    return <SandboxDenied locale={locale} />;
  }

  const parsed = parseSandboxSection(segments);
  if (parsed.kind === "product" || parsed.kind === "order") {
    return (
      <StoreExperience locale={locale} pathname={pathname} route={parsed} catalogQuery={catalogQuery} />
    );
  }
  if (parsed.kind === "section" && parsed.section.startsWith("store")) {
    return (
      <StoreExperience locale={locale} pathname={pathname} route={parsed} catalogQuery={catalogQuery} />
    );
  }

  let body: ReactNode;
  if (parsed.kind === "hub") body = <Hub locale={locale} />;
  else if (parsed.kind === "learning") {
    body = <LearningSandbox locale={locale} route={parsed.route} />;
  } else if (parsed.kind === "course") {
    body = <LearningSandbox locale={locale} route={{ surface: "course", slug: parsed.slug }} />;
  } else if (parsed.kind === "section") {
    switch (parsed.section) {
      case "commercial":
        body = <Commercial />;
        break;
      case "rights":
        body = <Rights />;
        break;
      default:
        body = <Hub locale={locale} />;
    }
  } else {
    body = <p>Unknown sandbox section.</p>;
  }

  return (
    <SandboxShell locale={locale} currentPath={pathname}>
      {body}
    </SandboxShell>
  );
}
