import type { AppLocale } from "../../i18n/locales";
import { LEARNING_LEARNER_ROUTES } from "../learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../publicCatalog";
import { LEARNING_TEACHER_ROUTES } from "../teacherPlatform";

export const DEMO_ASSET_BASE = "/demo/learning";

export type DemoCategoryId =
  | "ai"
  | "mobile"
  | "uiux"
  | "photography"
  | "languages"
  | "business"
  | "mathematics"
  | "marketing"
  | "programming";

export type DemoLocalized = { en: string; ar: string };

export type DemoTeacher = {
  id: string;
  handle: string;
  name: DemoLocalized;
  bio: DemoLocalized;
  specialties: DemoLocalized[];
  portrait: string;
  rating: number;
  students: number;
  courseCount: number;
  reviewCount: number;
  achievements: DemoLocalized[];
};

export type DemoStudent = {
  id: string;
  name: DemoLocalized;
  portrait: string;
  streakDays: number;
  umPoints: number;
};

export type DemoLessonType = "video" | "text" | "quiz" | "resource";

export type DemoLesson = {
  id: string;
  title: DemoLocalized;
  type: DemoLessonType;
  durationMin: number;
  completed?: boolean;
};

export type DemoChapter = {
  id: string;
  title: DemoLocalized;
  lessons: DemoLesson[];
};

export type DemoReview = {
  id: string;
  studentId: string;
  rating: number;
  comment: DemoLocalized;
};

export type DemoCourse = {
  id: string;
  slug: string;
  title: DemoLocalized;
  subtitle: DemoLocalized;
  description: DemoLocalized;
  category: DemoCategoryId;
  teacherId: string;
  cover: string;
  rating: number;
  enrollments: number;
  durationHours: number;
  level: "beginner" | "intermediate" | "advanced";
  language: "ar" | "en" | "both";
  isFree: boolean;
  isNew: boolean;
  isTrending: boolean;
  lessonCount: number;
  chapterCount: number;
  objectives: DemoLocalized[];
  prerequisites: DemoLocalized[];
  chapters: DemoChapter[];
  reviews: DemoReview[];
};

export type DemoEnrollment = {
  courseId: string;
  percent: number;
  status: "in_progress" | "completed" | "not_started";
  continueLessonId: string;
  saved?: boolean;
};

function L(en: string, ar: string): DemoLocalized {
  return { en, ar };
}

export function loc(value: DemoLocalized, locale: string): string {
  return locale === "ar" ? value.ar : value.en;
}

export const DEMO_VIEWER: DemoStudent = {
  id: "demo-student-lina-grove",
  name: L("Lina Grove-Demo", "لينا غروف-ديمو"),
  portrait: `${DEMO_ASSET_BASE}/students/lina.svg`,
  streakDays: 12,
  umPoints: 1840,
};

export const DEMO_STUDENTS: DemoStudent[] = [
  DEMO_VIEWER,
  {
    id: "demo-student-amina-cedar",
    name: L("Amina Cedar-Demo", "أمينة سيدار-ديمو"),
    portrait: `${DEMO_ASSET_BASE}/students/amina.svg`,
    streakDays: 21,
    umPoints: 2460,
  },
  {
    id: "demo-student-rami-orchid",
    name: L("Rami Orchid-Demo", "رامي أوركيد-ديمو"),
    portrait: `${DEMO_ASSET_BASE}/students/rami.svg`,
    streakDays: 6,
    umPoints: 720,
  },
  {
    id: "demo-student-hana-harbor",
    name: L("Hana Harbor-Demo", "هناء هاربر-ديمو"),
    portrait: `${DEMO_ASSET_BASE}/students/hana.svg`,
    streakDays: 9,
    umPoints: 1110,
  },
];

export const DEMO_TEACHERS: DemoTeacher[] = [
  {
    id: "demo-teacher-nour-qamar",
    handle: "nour-qamar-demo",
    name: L("Nour Qamar-Demo", "نور قمر-ديمو"),
    bio: L(
      "Fictional studio teacher exploring practical AI craft for Arabic-first makers.",
      "معلمة استوديو خيالية تستكشف حرف الذكاء العملي لصانعين عربيين أولاً."
    ),
    specialties: [L("AI studio", "استوديو الذكاء"), L("Prompt craft", "حرفة التوجيه")],
    portrait: `${DEMO_ASSET_BASE}/teachers/nour.svg`,
    rating: 4.9,
    students: 12840,
    courseCount: 3,
    reviewCount: 864,
    achievements: [L("Mentor badge", "شارة المرشد"), L("Studio fellow", "زميل الاستوديو")],
  },
  {
    id: "demo-teacher-kareem-pixel",
    handle: "kareem-pixel-demo",
    name: L("Kareem Pixel-Demo", "كريم بكسل-ديمو"),
    bio: L(
      "Demo mobile craftsman. Builds pocket interfaces with calm motion.",
      "حرفي جوال تجريبي. يبني واجهات جيب بحركة هادئة."
    ),
    specialties: [L("Mobile", "الجوال"), L("Programming", "البرمجة")],
    portrait: `${DEMO_ASSET_BASE}/teachers/kareem.svg`,
    rating: 4.8,
    students: 9320,
    courseCount: 2,
    reviewCount: 512,
    achievements: [L("Ship streak", "سلسلة الإطلاق")],
  },
  {
    id: "demo-teacher-layla-horizon",
    handle: "layla-horizon-demo",
    name: L("Layla Horizon-Demo", "ليلى هورايزون-ديمو"),
    bio: L(
      "Fictional interface editor. Teaches rhythm, space, and quiet type.",
      "محررة واجهات خيالية. تُدرّس الإيقاع والمساحة والخط الهادئ."
    ),
    specialties: [L("UI/UX", "واجهات وتجربة"), L("Visual systems", "أنظمة بصرية")],
    portrait: `${DEMO_ASSET_BASE}/teachers/layla.svg`,
    rating: 4.9,
    students: 15110,
    courseCount: 2,
    reviewCount: 940,
    achievements: [L("Clarity award", "جائزة الوضوح")],
  },
  {
    id: "demo-teacher-sami-atlas",
    handle: "sami-atlas-demo",
    name: L("Sami Atlas-Demo", "سامي أطلس-ديمو"),
    bio: L(
      "Demo photographer of north light and city dusk. Not a real person.",
      "مصور تجريبي لضوء الشمال وغسق المدينة. ليس شخصاً حقيقياً."
    ),
    specialties: [L("Photography", "التصوير"), L("Light study", "دراسة الضوء")],
    portrait: `${DEMO_ASSET_BASE}/teachers/sami.svg`,
    rating: 4.7,
    students: 7040,
    courseCount: 1,
    reviewCount: 288,
    achievements: [L("Frame keeper", "حارس الإطار")],
  },
  {
    id: "demo-teacher-mira-north",
    handle: "mira-north-demo",
    name: L("Mira North-Demo", "ميرا نورث-ديمو"),
    bio: L(
      "Languages and calm company systems. Entirely fictional demo identity.",
      "لغات وأنظمة شركات هادئة. هوية تجريبية خيالية بالكامل."
    ),
    specialties: [L("Languages", "اللغات"), L("Business", "الأعمال")],
    portrait: `${DEMO_ASSET_BASE}/teachers/mira.svg`,
    rating: 4.8,
    students: 11020,
    courseCount: 2,
    reviewCount: 671,
    achievements: [L("Voice atelier", "أتولييه الصوت")],
  },
  {
    id: "demo-teacher-yusuf-vector",
    handle: "yusuf-vector-demo",
    name: L("Yusuf Vector-Demo", "يوسف فيكتور-ديمو"),
    bio: L(
      "Demo mathematician and market-signal tutor. Separable from production.",
      "معلم رياضيات وإشارات سوق تجريبي. منفصل عن الإنتاج."
    ),
    specialties: [L("Mathematics", "الرياضيات"), L("Digital marketing", "التسويق الرقمي")],
    portrait: `${DEMO_ASSET_BASE}/teachers/yusuf.svg`,
    rating: 4.6,
    students: 5880,
    courseCount: 2,
    reviewCount: 301,
    achievements: [L("Proof garden", "حديقة البرهان")],
  },
];

const L1 = "a1111111-1111-4111-8111-111111111111";
const L2 = "a2222222-2222-4222-8222-222222222222";
const L3 = "a3333333-3333-4333-8333-333333333333";
const L4 = "a4444444-4444-4444-8444-444444444444";
const L5 = "a5555555-5555-4555-8555-555555555555";
const L6 = "a6666666-6666-4666-8666-666666666666";
const L7 = "a7777777-7777-4777-8777-777777777777";
const L8 = "a8888888-8888-4888-8888-888888888888";
const L9 = "a9999999-9999-4999-8999-999999999999";

function chapters(
  titles: [DemoLocalized, DemoLocalized, DemoLocalized],
  lessonIds: [string, string, string]
): DemoChapter[] {
  return titles.map((title, index) => ({
    id: `ch-${index + 1}`,
    title,
    lessons: [
      {
        id: lessonIds[index],
        title: title,
        type: index === 2 ? "quiz" : index === 1 ? "text" : "video",
        durationMin: 12 + index * 6,
        completed: index === 0,
      },
      {
        id: `${lessonIds[index].slice(0, 8)}-b${index}`,
        title: L(`Studio note ${index + 1}`, `ملاحظة الاستوديو ${index + 1}`),
        type: index === 1 ? "resource" : "video",
        durationMin: 8,
      },
    ],
  }));
}

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: "demo-course-ai-studio",
    slug: "signals-of-thought-ai-studio",
    title: L("Signals of Thought: Practical AI Studio", "إشارات الفكر: استوديو الذكاء العملي"),
    subtitle: L("Build calm AI workflows without hype.", "ابنِ مسارات ذكاء هادئة بلا ضجيج."),
    description: L(
      "A fictional UMTUBA studio course on sketching, testing, and shipping AI helpers for real Arabic and English work.",
      "دورة استوديو امتوبا خيالية في رسم واختبار وإطلاق مساعدات ذكاء للعمل العربي والإنجليزي الحقيقي."
    ),
    category: "ai",
    teacherId: "demo-teacher-nour-qamar",
    cover: `${DEMO_ASSET_BASE}/covers/ai.svg`,
    rating: 4.9,
    enrollments: 18420,
    durationHours: 11,
    level: "intermediate",
    language: "both",
    isFree: false,
    isNew: false,
    isTrending: true,
    lessonCount: 28,
    chapterCount: 6,
    objectives: [
      L("Map a useful AI workflow", "ارسم مسار ذكاء مفيداً"),
      L("Evaluate outputs with taste", "قيّم المخرجات بذوق"),
    ],
    prerequisites: [L("Curiosity and a notebook", "فضول ودفتر")],
    chapters: chapters(
      [
        L("Studio compass", "بوصلة الاستوديو"),
        L("Prompt gardens", "حدائق التوجيه"),
        L("Ship the helper", "أطلق المساعد"),
      ],
      [L1, L2, L3]
    ),
    reviews: [
      {
        id: "rev-ai-1",
        studentId: "demo-student-amina-cedar",
        rating: 5,
        comment: L("Clear, warm, and never salesy.", "واضح ودافئ وبعيد عن البيع."),
      },
    ],
  },
  {
    id: "demo-course-mobile",
    slug: "pocket-craft-mobile-studio",
    title: L("Pocket Craft: Native Mobile Studio", "حرفة الجيب: استوديو الجوال الأصلي"),
    subtitle: L("Motion, thumbs, and durable screens.", "حركة وإبهام وشاشات تدوم."),
    description: L(
      "Demo mobile course for building UMTUBA-like pocket surfaces with generous space.",
      "دورة جوال تجريبية لبناء أسطح جيب بأسلوب امتوبا ومساحة سخية."
    ),
    category: "mobile",
    teacherId: "demo-teacher-kareem-pixel",
    cover: `${DEMO_ASSET_BASE}/covers/mobile.svg`,
    rating: 4.8,
    enrollments: 12110,
    durationHours: 16,
    level: "intermediate",
    language: "en",
    isFree: false,
    isNew: true,
    isTrending: true,
    lessonCount: 34,
    chapterCount: 7,
    objectives: [L("Design thumb-first flows", "صمّم تدفقات للإبهام أولاً")],
    prerequisites: [L("Basic programming", "برمجة أساسية")],
    chapters: chapters(
      [
        L("Pocket grammar", "قواعد الجيب"),
        L("Motion hush", "همس الحركة"),
        L("Release night", "ليلة الإطلاق"),
      ],
      [L4, "a4444444-bbbb-4444-8444-444444444444", "a4444444-cccc-4444-8444-444444444444"]
    ),
    reviews: [
      {
        id: "rev-mo-1",
        studentId: "demo-student-rami-orchid",
        rating: 5,
        comment: L("Felt like a real workshop.", "أحسست أنها ورشة حقيقية."),
      },
    ],
  },
  {
    id: "demo-course-uiux",
    slug: "quiet-interfaces",
    title: L("Quiet Interfaces", "واجهات هادئة"),
    subtitle: L("Rhythm, space, and honest type.", "إيقاع ومساحة وخط صادق."),
    description: L(
      "Fictional UI/UX atelier for product surfaces that feel premium without noise.",
      "أتولييه واجهات خيالي لأسطح منتج تبدو فاخرة بلا ضوضاء."
    ),
    category: "uiux",
    teacherId: "demo-teacher-layla-horizon",
    cover: `${DEMO_ASSET_BASE}/covers/uiux.svg`,
    rating: 4.9,
    enrollments: 20110,
    durationHours: 9,
    level: "beginner",
    language: "both",
    isFree: true,
    isNew: false,
    isTrending: true,
    lessonCount: 22,
    chapterCount: 5,
    objectives: [L("Compose a calm screen", "ألّف شاشة هادئة")],
    prerequisites: [L("None", "لا يوجد")],
    chapters: chapters(
      [
        L("Space first", "المساحة أولاً"),
        L("Type weather", "طقس الخط"),
        L("Critique circle", "حلقة النقد"),
      ],
      [L5, "a5555555-bbbb-4555-8555-555555555555", "a5555555-cccc-4555-8555-555555555555"]
    ),
    reviews: [
      {
        id: "rev-ui-1",
        studentId: "demo-student-hana-harbor",
        rating: 5,
        comment: L("Beautiful and useful.", "جميل ومفيد."),
      },
    ],
  },
  {
    id: "demo-course-photo",
    slug: "north-light-frames",
    title: L("North Light Frames", "إطارات الضوء الشمالي"),
    subtitle: L("See dusk, hold still, edit softly.", "ارَ الغسق، اثبت، وحرّر بهدوء."),
    description: L(
      "Demo photography path using generated light studies. No real photographer identity.",
      "مسار تصوير تجريبي بدراسات ضوء مولّدة. بلا هوية مصور حقيقية."
    ),
    category: "photography",
    teacherId: "demo-teacher-sami-atlas",
    cover: `${DEMO_ASSET_BASE}/covers/photography.svg`,
    rating: 4.7,
    enrollments: 6880,
    durationHours: 8,
    level: "beginner",
    language: "ar",
    isFree: true,
    isNew: true,
    isTrending: false,
    lessonCount: 18,
    chapterCount: 4,
    objectives: [L("Read available light", "اقرأ الضوء المتاح")],
    prerequisites: [L("Any camera or phone", "أي كاميرا أو هاتف")],
    chapters: chapters(
      [
        L("Window hour", "ساعة النافذة"),
        L("City dusk", "غسق المدينة"),
        L("Soft grade", "تدرج ناعم"),
      ],
      [L6, "a6666666-bbbb-4666-8666-666666666666", "a6666666-cccc-4666-8666-666666666666"]
    ),
    reviews: [
      {
        id: "rev-ph-1",
        studentId: "demo-student-lina-grove",
        rating: 4,
        comment: L("Made me walk slower.", "جعلني أمشي أبطأ."),
      },
    ],
  },
  {
    id: "demo-course-languages",
    slug: "arabic-atelier-everyday-voice",
    title: L("Arabic Atelier: Everyday Voice", "أتولييه العربية: صوت كل يوم"),
    subtitle: L("Speak with warmth, not drills.", "تحدّث بدفء لا بتمارين جافة."),
    description: L(
      "Fictional language studio for everyday Arabic conversation on UMTUBA.",
      "استوديو لغات خيالي لمحادثة عربية يومية على امتوبا."
    ),
    category: "languages",
    teacherId: "demo-teacher-mira-north",
    cover: `${DEMO_ASSET_BASE}/covers/languages.svg`,
    rating: 4.8,
    enrollments: 15440,
    durationHours: 14,
    level: "beginner",
    language: "ar",
    isFree: false,
    isNew: false,
    isTrending: true,
    lessonCount: 40,
    chapterCount: 8,
    objectives: [L("Hold a 10-minute chat", "أدِر حواراً لعشر دقائق")],
    prerequisites: [L("Alphabet comfort", "راحة مع الحروف")],
    chapters: chapters(
      [
        L("Morning phrases", "عبارات الصباح"),
        L("City errands", "مشاوير المدينة"),
        L("Story night", "ليلة الحكاية"),
      ],
      [L7, "a7777777-bbbb-4777-8777-777777777777", "a7777777-cccc-4777-8777-777777777777"]
    ),
    reviews: [
      {
        id: "rev-lg-1",
        studentId: "demo-student-amina-cedar",
        rating: 5,
        comment: L("Felt like a friend, not a textbook.", "كصديقة لا ككتاب."),
      },
    ],
  },
  {
    id: "demo-course-business",
    slug: "calm-company-systems",
    title: L("Calm Company Systems", "أنظمة الشركة الهادئة"),
    subtitle: L("Offers, ops, and honest pacing.", "عروض وتشغيل وإيقاع صادق."),
    description: L(
      "Demo business course for small studios that refuse chaos.",
      "دورة أعمال تجريبية للاستوديوهات الصغيرة التي ترفض الفوضى."
    ),
    category: "business",
    teacherId: "demo-teacher-mira-north",
    cover: `${DEMO_ASSET_BASE}/covers/business.svg`,
    rating: 4.6,
    enrollments: 4990,
    durationHours: 7,
    level: "intermediate",
    language: "both",
    isFree: false,
    isNew: true,
    isTrending: false,
    lessonCount: 16,
    chapterCount: 4,
    objectives: [L("Write a clear offer", "اكتب عرضاً واضحاً")],
    prerequisites: [L("A project you care about", "مشروع تهتم به")],
    chapters: chapters(
      [
        L("Offer spine", "عمود العرض"),
        L("Weekly ops", "تشغيل الأسبوع"),
        L("Client hush", "هدوء العميل"),
      ],
      ["b1111111-1111-4111-8111-111111111111", "b2222222-2222-4222-8222-222222222222", "b3333333-3333-4333-8333-333333333333"]
    ),
    reviews: [
      {
        id: "rev-bz-1",
        studentId: "demo-student-rami-orchid",
        rating: 4,
        comment: L("Practical without jargon fog.", "عملي بلا ضباب مصطلحات."),
      },
    ],
  },
  {
    id: "demo-course-math",
    slug: "proof-garden",
    title: L("Proof Garden", "حديقة البرهان"),
    subtitle: L("See structure, then write it.", "ارَ البنية ثم اكتبها."),
    description: L(
      "Fictional mathematics garden for visual proofs and quiet confidence.",
      "حديقة رياضيات خيالية للبراهين البصرية والثقة الهادئة."
    ),
    category: "mathematics",
    teacherId: "demo-teacher-yusuf-vector",
    cover: `${DEMO_ASSET_BASE}/covers/mathematics.svg`,
    rating: 4.7,
    enrollments: 3770,
    durationHours: 12,
    level: "advanced",
    language: "ar",
    isFree: true,
    isNew: false,
    isTrending: false,
    lessonCount: 24,
    chapterCount: 6,
    objectives: [L("Explain one proof aloud", "اشرح برهاناً واحداً بصوت")],
    prerequisites: [L("Secondary algebra", "جبر ثانوي")],
    chapters: chapters(
      [
        L("Pattern walk", "نزهة النمط"),
        L("Write the why", "اكتب السبب"),
        L("Garden quiz", "اختبار الحديقة"),
      ],
      [L8, "a8888888-bbbb-4888-8888-888888888888", "a8888888-cccc-4888-8888-888888888888"]
    ),
    reviews: [
      {
        id: "rev-ma-1",
        studentId: "demo-student-hana-harbor",
        rating: 5,
        comment: L("Finally felt math as design.", "أخيراً أحسست بالرياضيات كتصميم."),
      },
    ],
  },
  {
    id: "demo-course-marketing",
    slug: "honest-market-signals",
    title: L("Honest Market Signals", "إشارات السوق الصادقة"),
    subtitle: L("Attention without tricks.", "انتباه بلا حيل."),
    description: L(
      "Demo digital marketing course focused on truthful signals and craft.",
      "دورة تسويق رقمي تجريبية تركز على إشارات صادقة وحرفة."
    ),
    category: "marketing",
    teacherId: "demo-teacher-yusuf-vector",
    cover: `${DEMO_ASSET_BASE}/covers/marketing.svg`,
    rating: 4.5,
    enrollments: 8120,
    durationHours: 6,
    level: "beginner",
    language: "both",
    isFree: false,
    isNew: true,
    isTrending: false,
    lessonCount: 15,
    chapterCount: 4,
    objectives: [L("Write one honest campaign", "اكتب حملة صادقة واحدة")],
    prerequisites: [L("None", "لا يوجد")],
    chapters: chapters(
      [
        L("Signal vs noise", "إشارة مقابل ضوضاء"),
        L("Story frames", "إطارات القصة"),
        L("Measure kindly", "قِس بلطف"),
      ],
      ["c1111111-1111-4111-8111-111111111111", "c2222222-2222-4222-8222-222222222222", "c3333333-3333-4333-8333-333333333333"]
    ),
    reviews: [
      {
        id: "rev-mk-1",
        studentId: "demo-student-lina-grove",
        rating: 4,
        comment: L("No growth-hack theater.", "بلا مسرح حيل النمو."),
      },
    ],
  },
  {
    id: "demo-course-programming",
    slug: "riverbed-typescript",
    title: L("Riverbed TypeScript", "تايب سكربت قاع النهر"),
    subtitle: L("Types that keep the current honest.", "أنواع تُبقي التيار صادقاً."),
    description: L(
      "Fictional programming studio for TypeScript craft inside UMTUBA-shaped apps.",
      "استوديو برمجة خيالي لحرفة تايب سكربت داخل تطبيقات بشكل امتوبا."
    ),
    category: "programming",
    teacherId: "demo-teacher-kareem-pixel",
    cover: `${DEMO_ASSET_BASE}/covers/programming.svg`,
    rating: 4.8,
    enrollments: 9900,
    durationHours: 18,
    level: "intermediate",
    language: "en",
    isFree: false,
    isNew: false,
    isTrending: true,
    lessonCount: 36,
    chapterCount: 8,
    objectives: [L("Model a small domain", "نمذِج نطاقاً صغيراً")],
    prerequisites: [L("JavaScript comfort", "راحة مع جافاسكربت")],
    chapters: chapters(
      [
        L("Types as banks", "الأنواع كضفاف"),
        L("Flow and errors", "التدفق والأخطاء"),
        L("Studio kata", "كاتا الاستوديو"),
      ],
      [L9, "a9999999-bbbb-4999-8999-999999999999", "a9999999-cccc-4999-8999-999999999999"]
    ),
    reviews: [
      {
        id: "rev-pr-1",
        studentId: "demo-student-rami-orchid",
        rating: 5,
        comment: L("Sharp and kind.", "حاد ولطيف."),
      },
    ],
  },
];

export const DEMO_ENROLLMENTS: DemoEnrollment[] = [
  {
    courseId: "demo-course-ai-studio",
    percent: 62,
    status: "in_progress",
    continueLessonId: L2,
  },
  {
    courseId: "demo-course-uiux",
    percent: 100,
    status: "completed",
    continueLessonId: L5,
  },
  {
    courseId: "demo-course-languages",
    percent: 28,
    status: "in_progress",
    continueLessonId: L7,
    saved: true,
  },
  {
    courseId: "demo-course-photo",
    percent: 0,
    status: "not_started",
    continueLessonId: L6,
    saved: true,
  },
];

export const DEMO_CATEGORIES: {
  id: DemoCategoryId;
  label: DemoLocalized;
  cover: string;
}[] = [
  { id: "ai", label: L("AI", "الذكاء الاصطناعي"), cover: `${DEMO_ASSET_BASE}/covers/ai.svg` },
  { id: "mobile", label: L("Mobile Development", "تطوير الجوال"), cover: `${DEMO_ASSET_BASE}/covers/mobile.svg` },
  { id: "uiux", label: L("UI/UX", "واجهات وتجربة"), cover: `${DEMO_ASSET_BASE}/covers/uiux.svg` },
  { id: "photography", label: L("Photography", "التصوير"), cover: `${DEMO_ASSET_BASE}/covers/photography.svg` },
  { id: "languages", label: L("Languages", "اللغات"), cover: `${DEMO_ASSET_BASE}/covers/languages.svg` },
  { id: "business", label: L("Business", "الأعمال"), cover: `${DEMO_ASSET_BASE}/covers/business.svg` },
  { id: "mathematics", label: L("Mathematics", "الرياضيات"), cover: `${DEMO_ASSET_BASE}/covers/mathematics.svg` },
  { id: "marketing", label: L("Digital Marketing", "التسويق الرقمي"), cover: `${DEMO_ASSET_BASE}/covers/marketing.svg` },
  { id: "programming", label: L("Programming", "البرمجة"), cover: `${DEMO_ASSET_BASE}/covers/programming.svg` },
];

export const DEMO_ACHIEVEMENTS: DemoLocalized[] = [
  L("Seven-day streak", "سلسلة سبعة أيام"),
  L("First certificate", "أول شهادة"),
  L("Curious reviewer", "مراجع فضولي"),
];

export function demoTeacher(id: string): DemoTeacher | undefined {
  return DEMO_TEACHERS.find((teacher) => teacher.id === id || teacher.handle === id);
}

export function demoCourse(slugOrId: string): DemoCourse | undefined {
  return DEMO_COURSES.find((course) => course.slug === slugOrId || course.id === slugOrId);
}

export function demoLesson(
  lessonId: string
): { course: DemoCourse; chapter: DemoChapter; lesson: DemoLesson } | null {
  for (const course of DEMO_COURSES) {
    for (const chapter of course.chapters) {
      const lesson = chapter.lessons.find((item) => item.id === lessonId);
      if (lesson) return { course, chapter, lesson };
    }
  }
  return null;
}

export function demoStudent(id: string): DemoStudent | undefined {
  return DEMO_STUDENTS.find((student) => student.id === id);
}

export function demoHref() {
  return {
    home: LEARNING_LEARNER_ROUTES.hub,
    library: `${LEARNING_LEARNER_ROUTES.hub}?surface=library`,
    catalog: LEARNING_PUBLIC_ROUTES.catalog,
    course: LEARNING_PUBLIC_ROUTES.course,
    lesson: LEARNING_LEARNER_ROUTES.lesson,
    teacher: LEARNING_TEACHER_ROUTES.publicProfile,
    become: LEARNING_TEACHER_ROUTES.become,
    center: LEARNING_TEACHER_ROUTES.center,
    builder: LEARNING_TEACHER_ROUTES.courseNew,
    builderEdit: LEARNING_TEACHER_ROUTES.courseEdit,
  };
}

export function relatedCourses(course: DemoCourse): DemoCourse[] {
  return DEMO_COURSES.filter(
    (item) => item.id !== course.id && item.category === course.category
  ).slice(0, 3);
}

export function coursesForTeacher(teacherId: string): DemoCourse[] {
  return DEMO_COURSES.filter((course) => course.teacherId === teacherId);
}

export function enrolledCourses(): { course: DemoCourse; enrollment: DemoEnrollment }[] {
  return DEMO_ENROLLMENTS.map((enrollment) => {
    const course = demoCourse(enrollment.courseId);
    if (!course) return null;
    return { course, enrollment };
  }).filter((row): row is { course: DemoCourse; enrollment: DemoEnrollment } => row !== null);
}

export function continueCourse(): { course: DemoCourse; enrollment: DemoEnrollment } | null {
  const rows = enrolledCourses().filter((row) => row.enrollment.status === "in_progress");
  return rows.sort((a, b) => b.enrollment.percent - a.enrollment.percent)[0] ?? null;
}

export function isRtlLocale(locale: AppLocale | string): boolean {
  return locale === "ar";
}
