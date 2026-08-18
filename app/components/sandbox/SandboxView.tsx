import Link from "next/link";
import type { ReactNode } from "react";
import type { AppLocale } from "../../../lib/i18n";
import { SANDBOX_COMMERCIAL_MODEL } from "../../../lib/sandbox/fixtures/commercial";
import {
  MOCK_PAYMENT_ADAPTER,
  SANDBOX_ORDERS,
  SANDBOX_PAYMENT_FLOWS,
} from "../../../lib/sandbox/fixtures/commerce";
import {
  courseLessonCount,
  getSandboxCourse,
  SANDBOX_COURSES,
} from "../../../lib/sandbox/fixtures/courses";
import {
  PROSPECTIVE_COMMERCE_PARTNERS,
  PROSPECTIVE_LEARNING_PARTNERS,
  SYNTHETIC_LEARNING_PROVIDERS,
} from "../../../lib/sandbox/fixtures/partners";
import { SANDBOX_INSTRUCTORS, SANDBOX_STUDENTS } from "../../../lib/sandbox/fixtures/people";
import { FOCUS_STUDENT_ID, progressForStudent, SANDBOX_STUDENT_PROGRESS } from "../../../lib/sandbox/fixtures/progress";
import {
  getSandboxListing,
  SANDBOX_CART_LINES,
  SANDBOX_DISCOUNT_EXAMPLES,
  SANDBOX_SHIPPING_EXAMPLES,
  SANDBOX_STORE_ACTORS,
  SANDBOX_STORE_LISTINGS,
} from "../../../lib/sandbox/fixtures/store";
import {
  effectiveRights,
  emptyRights,
  RIGHTS_FLAGS,
  type ProspectivePartner,
  type SandboxCourse,
} from "../../../lib/sandbox/fixtures/types";
import { sandboxT } from "../../../lib/sandbox/i18n";
import { parseSandboxSection, sandboxHref } from "../../../lib/sandbox/paths";
import { formatMinorUnits } from "../../../lib/store/money";
import SandboxCheckout from "./SandboxCheckout";
import SandboxDenied from "./SandboxDenied";
import SandboxShell from "./SandboxShell";

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

function KindBadge({ kind }: { kind: SandboxCourse["kind"] }) {
  return <span className="sx-badge">{kind.replaceAll("_", " ")}</span>;
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

function CourseList({
  locale,
  courses,
}: {
  locale: AppLocale;
  courses: readonly SandboxCourse[];
}) {
  return (
    <div className="sx-grid sx-grid-3">
      {courses.map((course) => (
        <Card
          key={course.id}
          title={course.title}
          href={sandboxHref(`learning/courses/${course.slug}`)}
          action={sandboxT(locale, "openCourse")}
        >
          <KindBadge kind={course.kind} />
          <p className="mt-2">{course.shortDescription}</p>
          <p className="mt-2 text-xs">
            status={course.status} · publish={course.publishState} · publicCatalog=NO
          </p>
        </Card>
      ))}
    </div>
  );
}

function Hub({ locale }: { locale: AppLocale }) {
  return (
    <>
      <p className="text-sm text-[var(--sx-muted)]">{sandboxT(locale, "originalsDraft")}</p>
      <div className="sx-grid sx-grid-3 mt-4">
        <Card title="Learning" href={sandboxHref("learning")}>
          {SANDBOX_STUDENTS.length} students · {SANDBOX_INSTRUCTORS.length} instructors ·{" "}
          {SANDBOX_COURSES.length} courses
        </Card>
        <Card title="Store" href={sandboxHref("store")}>
          {SANDBOX_STORE_LISTINGS.length} DEMO products · {SANDBOX_STORE_ACTORS.length} synthetic
          actors
        </Card>
        <Card title="Partners" href={sandboxHref("rights")}>
          {PROSPECTIVE_LEARNING_PARTNERS.length} learning + {PROSPECTIVE_COMMERCE_PARTNERS.length}{" "}
          commerce prospective · REAL_PARTNERSHIPS_CLAIMED=0
        </Card>
      </div>
    </>
  );
}

function LearningHome({ locale }: { locale: AppLocale }) {
  return (
    <>
      <h2 className="text-xl font-semibold">{sandboxT(locale, "learning")}</h2>
      <CourseList locale={locale} courses={SANDBOX_COURSES} />
    </>
  );
}

function CourseDetail({ locale, slug }: { locale: AppLocale; slug: string }) {
  const course = getSandboxCourse(slug);
  if (!course) {
    return <p>Unknown sandbox course.</p>;
  }
  return (
    <div>
      <KindBadge kind={course.kind} />
      <h2 className="mt-3 text-2xl font-semibold">{course.title}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{course.shortDescription}</p>
      <p className="mt-2 text-xs">
        owner={course.contentOwner} · certificate={course.certificateOwner} · AI Tutor={" "}
        {course.aiTutorAllowed ? "sandbox owned only" : "DENIED"} · enroll={course.enrollmentMode}
      </p>
      {course.kind === "EXTERNAL_COURSE" ? (
        <p className="sx-card mt-4">
          {sandboxT(locale, "continueProvider")} — no hosted third-party lessons, no copied catalog.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {course.modules.map((module) => (
            <article key={module.id} className="sx-card">
              <h3 className="font-semibold">{module.title}</h3>
              <p className="mt-1 text-sm text-[var(--sx-muted)]">{module.summary}</p>
              <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <strong>{lesson.title}</strong> ({lesson.kind}, {lesson.estimatedMinutes}m)
                    <p className="text-[var(--sx-muted)]">{lesson.body}</p>
                    {lesson.quiz[0] ? (
                      <p className="mt-1 text-xs">Quiz: {lesson.quiz[0].prompt}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </article>
          ))}
          <p className="text-xs text-[var(--sx-faint)]">
            {course.modules.length} modules · {courseLessonCount(course)} lessons · exercises{" "}
            {course.exercises.length}
          </p>
        </div>
      )}
    </div>
  );
}

function StudentDash() {
  const rows = progressForStudent(FOCUS_STUDENT_ID);
  return (
    <>
      <h2 className="text-xl font-semibold">Demo Student 01 · dashboard</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        Synthetic journey only. {SANDBOX_STUDENT_PROGRESS.length} student rows in the fixture.
      </p>
      <div className="sx-grid mt-4">
        {rows.map((row) => (
          <Card key={row.courseSlug} title={row.courseTitle}>
            {row.percent}% · {row.lessonsCompleted}/{row.lessonsTotal} lessons · certificate=
            {row.certificate}
          </Card>
        ))}
      </div>
    </>
  );
}

function InstructorDash() {
  return (
    <>
      <h2 className="text-xl font-semibold">Instructor sandbox</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        Onboarding DRAFT → ACTIVE is a label only. No fake legal verification.
      </p>
      <div className="sx-grid mt-4">
        {SANDBOX_INSTRUCTORS.map((person) => (
          <Card key={person.id} title={person.displayName}>
            specialty={person.specialty} · onboarding={person.onboarding}
          </Card>
        ))}
      </div>
    </>
  );
}

function LearningAdmin() {
  return (
    <>
      <h2 className="text-xl font-semibold">Learning admin</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        Prospective partner records stay PROSPECTIVE. They cannot become ACTIVE here.
      </p>
      <div className="sx-grid mt-4">
        {SYNTHETIC_LEARNING_PROVIDERS.map((provider) => (
          <Card key={provider.id} title={provider.displayName}>
            status={provider.status} · {provider.note}
          </Card>
        ))}
      </div>
      <div className="sx-grid mt-4">
        {SANDBOX_COURSES.map((course) => (
          <Card key={course.id} title={course.title}>
            {course.kind} · {course.status} · takedown/suspension are preview labels only
          </Card>
        ))}
      </div>
    </>
  );
}

function StoreHome({ locale }: { locale: AppLocale }) {
  return (
    <>
      <h2 className="text-xl font-semibold">{sandboxT(locale, "store")}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        26 reused DEMO products. NOT REAL INVENTORY. NON-PURCHASABLE IN PRODUCTION.
      </p>
      <div className="sx-grid sx-grid-3 mt-4">
        {SANDBOX_STORE_LISTINGS.map((listing) => (
          <Card
            key={listing.product.id}
            title={listing.product.title}
            href={sandboxHref(`store/products/${listing.product.slug}`)}
            action={sandboxT(locale, "openProduct")}
          >
            <span className="sx-badge">DEMO</span> · {listing.commerceMode} ·{" "}
            {formatMinorUnits(listing.product.variants[0]?.priceMinor ?? 0, "USD")}
          </Card>
        ))}
      </div>
    </>
  );
}

function ProductDetail({ slug }: { slug: string }) {
  const listing = getSandboxListing(slug);
  if (!listing) return <p>Unknown sandbox product.</p>;
  const product = listing.product;
  return (
    <article className="sx-card">
      <span className="sx-badge">DEMO</span>
      <h2 className="mt-3 text-2xl font-semibold">{product.title}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{product.description}</p>
      <p className="mt-3 text-sm">
        {formatMinorUnits(product.variants[0]?.priceMinor ?? 0, "USD")} · mode=
        {listing.commerceMode} · actor={listing.actorId}
      </p>
      <ul className="mt-3 text-sm">
        {product.variants.map((variant) => (
          <li key={variant.id}>
            {variant.title} · {formatMinorUnits(variant.priceMinor, variant.currency)} · onHand=
            {variant.onHand} (synthetic)
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs">PURCHASABLE=NO · PRODUCTION_SELLABLE=NO · REAL_PROVIDER=NONE</p>
    </article>
  );
}

function Cart() {
  const subtotal = SANDBOX_CART_LINES.reduce(
    (sum, line) => sum + line.unitMinor * line.quantity,
    0
  );
  return (
    <>
      <h2 className="text-xl font-semibold">Sandbox cart</h2>
      <div className="sx-grid mt-4">
        {SANDBOX_CART_LINES.map((line) => (
          <Card key={line.productSlug} title={line.title}>
            {line.quantity} × {formatMinorUnits(line.unitMinor, line.currency)} · {line.variantTitle}{" "}
            · {line.commerceMode}
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm">
        Subtotal {formatMinorUnits(subtotal, "USD")} · discount example{" "}
        {SANDBOX_DISCOUNT_EXAMPLES[0]?.label} · shipping {SANDBOX_SHIPPING_EXAMPLES[0]?.label}
      </p>
    </>
  );
}

function Checkout({ locale }: { locale: AppLocale }) {
  return (
    <>
      <h2 className="text-xl font-semibold">{sandboxT(locale, "storeCheckout")}</h2>
      <Cart />
      <SandboxCheckout
        successLabel={sandboxT(locale, "simulateSuccess")}
        failureLabel={sandboxT(locale, "simulateFailure")}
        refundLabel={sandboxT(locale, "simulateRefund")}
        blockedLabel={sandboxT(locale, "checkoutBlocked")}
      />
    </>
  );
}

function Orders() {
  return (
    <>
      <h2 className="text-xl font-semibold">Sandbox orders</h2>
      <div className="sx-grid mt-4">
        {SANDBOX_ORDERS.map((order) => (
          <Card key={order.id} title={order.id}>
            {order.productTitle} · {formatMinorUnits(order.amountMinor, order.currency)} ·{" "}
            {order.status} · {order.paymentOutcome} · {order.customerName}
          </Card>
        ))}
      </div>
      <ul className="mt-4 text-sm text-[var(--sx-muted)]">
        {SANDBOX_PAYMENT_FLOWS.map((flow) => (
          <li key={flow.id}>
            {flow.label} → {flow.orderId}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs">
        Adapter {MOCK_PAYMENT_ADAPTER.id}. REAL_PAYMENTS=0.
      </p>
    </>
  );
}

function Seller() {
  return (
    <>
      <h2 className="text-xl font-semibold">Seller dashboard</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">No actual payout. SANDBOX only.</p>
      <div className="sx-grid mt-4">
        {SANDBOX_STORE_ACTORS.map((actor) => (
          <Card key={actor.id} title={actor.displayName}>
            {actor.kind} · listings{" "}
            {SANDBOX_STORE_LISTINGS.filter((listing) => listing.actorId === actor.id).length} ·
            payout=OFF
          </Card>
        ))}
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
}: {
  locale: AppLocale;
  pathname: string;
  allowed: boolean;
  segments?: string[];
}) {
  if (!allowed) {
    return <SandboxDenied locale={locale} />;
  }

  const parsed = parseSandboxSection(segments);
  let body: ReactNode;
  if (parsed.kind === "hub") body = <Hub locale={locale} />;
  else if (parsed.kind === "course") body = <CourseDetail locale={locale} slug={parsed.slug} />;
  else if (parsed.kind === "product") body = <ProductDetail slug={parsed.slug} />;
  else if (parsed.kind === "section") {
    switch (parsed.section) {
      case "learning":
        body = <LearningHome locale={locale} />;
        break;
      case "learning/student":
        body = <StudentDash />;
        break;
      case "learning/instructor":
        body = <InstructorDash />;
        break;
      case "learning/admin":
        body = <LearningAdmin />;
        break;
      case "learning/partners":
        body = (
          <>
            <h2 className="text-xl font-semibold">{sandboxT(locale, "learningPartners")}</h2>
            <div className="mt-4 space-y-3">
              {PROSPECTIVE_LEARNING_PARTNERS.map((partner) => (
                <RightsTable key={partner.id} partner={partner} />
              ))}
            </div>
          </>
        );
        break;
      case "store":
        body = <StoreHome locale={locale} />;
        break;
      case "store/cart":
        body = <Cart />;
        break;
      case "store/checkout":
        body = <Checkout locale={locale} />;
        break;
      case "store/orders":
        body = <Orders />;
        break;
      case "store/seller":
        body = <Seller />;
        break;
      case "store/partners":
        body = (
          <>
            <h2 className="text-xl font-semibold">{sandboxT(locale, "storePartners")}</h2>
            <div className="mt-4 space-y-3">
              {PROSPECTIVE_COMMERCE_PARTNERS.map((partner) => (
                <RightsTable key={partner.id} partner={partner} />
              ))}
            </div>
          </>
        );
        break;
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
