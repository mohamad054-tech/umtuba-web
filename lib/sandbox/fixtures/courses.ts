import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "./originals";
import type { SandboxCourse, SandboxLesson, SandboxModule } from "./types";

function hostedModule(
  prefix: string,
  title: string,
  summary: string
): SandboxModule {
  const lessons: SandboxLesson[] = [
    {
      id: `${prefix}-l1`,
      title: `${title} — orientation`,
      kind: "text",
      estimatedMinutes: 6,
      body: `${summary} This is synthetic UMTUBA sandbox copy. It is not a third-party catalog excerpt.`,
      quiz: [],
    },
    {
      id: `${prefix}-l2`,
      title: `${title} — practice`,
      kind: "text",
      estimatedMinutes: 6,
      body: "Practice stays inside the sandbox. No outbound enrollment and no copied partner lesson text.",
      quiz: [],
    },
    {
      id: `${prefix}-q`,
      title: `${title} — check`,
      kind: "quiz",
      estimatedMinutes: 3,
      body: "Sandbox check only.",
      quiz: [
        {
          id: `${prefix}-q1`,
          prompt: "Is this course a live partner import?",
          choices: [
            { id: "a", text: "Yes, it is a real catalog import." },
            { id: "b", text: "No. It is synthetic sandbox content." },
            { id: "c", text: "Yes, after checkout." },
            { id: "d", text: "Yes, because the title sounds familiar." },
          ],
          correctChoiceId: "b",
          explanation: "Partner-course previews in this sandbox are synthetic.",
        },
      ],
    },
  ];
  return { id: prefix, title, summary, lessons };
}

function fourModules(slug: string, theme: string): SandboxModule[] {
  return [
    hostedModule(`${slug}-m1`, `${theme} foundations`, `Synthetic ${theme} foundations.`),
    hostedModule(`${slug}-m2`, `${theme} methods`, `Synthetic ${theme} methods.`),
    hostedModule(`${slug}-m3`, `${theme} review`, `Synthetic ${theme} review.`),
    hostedModule(`${slug}-m4`, `${theme} close`, `Synthetic ${theme} close.`),
  ];
}

const PARTNER_SEEDS = [
  {
    slug: "demo-partner-structured-thinking",
    title: "Demo Partner Course — Structured Thinking for Teams",
    instructorId: "demo-instructor-07",
    providerId: "demo-provider-atlas",
    theme: "structured thinking",
  },
  {
    slug: "demo-partner-visual-systems",
    title: "Demo Partner Course — Visual Systems Basics",
    instructorId: "demo-instructor-02",
    providerId: "demo-provider-atlas",
    theme: "visual systems",
  },
  {
    slug: "demo-partner-clear-specs",
    title: "Demo Partner Course — Writing Clear Specs",
    instructorId: "demo-instructor-03",
    providerId: "demo-provider-helix",
    theme: "clear specs",
  },
  {
    slug: "demo-partner-data-hygiene",
    title: "Demo Partner Course — Intro to Data Hygiene",
    instructorId: "demo-instructor-05",
    providerId: "demo-provider-helix",
    theme: "data hygiene",
  },
  {
    slug: "demo-partner-accessibility-habits",
    title: "Demo Partner Course — Accessibility Habits",
    instructorId: "demo-instructor-06",
    providerId: "demo-provider-atlas",
    theme: "accessibility habits",
  },
  {
    slug: "demo-partner-calm-productivity",
    title: "Demo Partner Course — Calm Productivity",
    instructorId: "demo-instructor-08",
    providerId: "demo-provider-helix",
    theme: "calm productivity",
  },
  {
    slug: "demo-partner-helpful-feedback",
    title: "Demo Partner Course — Feedback That Helps",
    instructorId: "demo-instructor-03",
    providerId: "demo-provider-atlas",
    theme: "helpful feedback",
  },
] as const;

const EXTERNAL_SEEDS = [
  {
    slug: "demo-external-cloud-primer",
    title: "Demo External Course — Provider Cloud Primer",
    instructorId: "demo-instructor-08",
    providerId: "demo-external-nimbus",
  },
  {
    slug: "demo-external-language-lab",
    title: "Demo External Course — Provider Language Lab",
    instructorId: "demo-instructor-03",
    providerId: "demo-external-nimbus",
  },
  {
    slug: "demo-external-career-toolkit",
    title: "Demo External Course — Provider Career Toolkit",
    instructorId: "demo-instructor-07",
    providerId: "demo-external-harbor",
  },
  {
    slug: "demo-external-finance-literacy",
    title: "Demo External Course — Provider Finance Literacy",
    instructorId: "demo-instructor-05",
    providerId: "demo-external-harbor",
  },
  {
    slug: "demo-external-design-critique",
    title: "Demo External Course — Provider Design Critique",
    instructorId: "demo-instructor-02",
    providerId: "demo-external-nimbus",
  },
  {
    slug: "demo-external-research-notes",
    title: "Demo External Course — Provider Research Notes",
    instructorId: "demo-instructor-01",
    providerId: "demo-external-harbor",
  },
] as const;

export const SANDBOX_PARTNER_COURSES: readonly SandboxCourse[] = PARTNER_SEEDS.map(
  (seed, index) => ({
    id: `sandbox-partner-${index + 1}`,
    slug: seed.slug,
    title: seed.title,
    kind: "PARTNER_COURSE" as const,
    status: "REVIEW" as const,
    publishState: "SANDBOX_ONLY" as const,
    shortDescription:
      "Synthetic partner-course preview. Provider is a demo label, not a real company. Not a live import.",
    instructorId: seed.instructorId,
    providerId: seed.providerId,
    contentOwner: seed.providerId,
    certificateOwner: seed.providerId,
    aiTutorAllowed: false,
    enrollmentMode: "SANDBOX_ENROLL" as const,
    revenueSharePercent: 20,
    modules: fourModules(seed.slug, seed.theme),
    exercises: [
      {
        id: `${seed.slug}-ex`,
        title: "Sandbox practice",
        prompt: "Describe one hosted lesson habit without naming a real partner catalog.",
      },
    ],
    publicCatalog: false,
    synthetic: true,
  })
);

export const SANDBOX_EXTERNAL_COURSES: readonly SandboxCourse[] = EXTERNAL_SEEDS.map(
  (seed, index) => ({
    id: `sandbox-external-${index + 1}`,
    slug: seed.slug,
    title: seed.title,
    kind: "EXTERNAL_COURSE" as const,
    status: "DRAFT" as const,
    publishState: "NOT_PUBLIC" as const,
    shortDescription:
      "Affiliate / referral UX only. No hosted third-party lessons. Continue with provider is a sandbox button.",
    instructorId: seed.instructorId,
    providerId: seed.providerId,
    contentOwner: seed.providerId,
    certificateOwner: seed.providerId,
    aiTutorAllowed: false,
    enrollmentMode: "EXTERNAL_CONTINUE" as const,
    revenueSharePercent: null,
    modules: [],
    exercises: [],
    publicCatalog: false,
    synthetic: true,
  })
);

export const SANDBOX_COURSES: readonly SandboxCourse[] = [
  ...UMTUBA_ORIGINAL_SANDBOX_COURSES,
  ...SANDBOX_PARTNER_COURSES,
  ...SANDBOX_EXTERNAL_COURSES,
];

export function getSandboxCourse(slug: string): SandboxCourse | undefined {
  return SANDBOX_COURSES.find((course) => course.slug === slug || course.id === slug);
}

export function courseLessonCount(course: SandboxCourse): number {
  return course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
}
