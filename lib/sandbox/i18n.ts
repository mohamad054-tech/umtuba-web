import {
  getLocaleDirection,
  type AppLocale,
  type TextDirection,
} from "../i18n/locales";

export type SandboxMessageKey =
  | "title"
  | "subtitle"
  | "badge"
  | "banner"
  | "deniedTitle"
  | "deniedBody"
  | "signIn"
  | "hub"
  | "learning"
  | "learningStudent"
  | "learningInstructor"
  | "learningAdmin"
  | "learningPartners"
  | "store"
  | "storeCart"
  | "storeCheckout"
  | "storeOrders"
  | "storeSeller"
  | "storePartners"
  | "commercial"
  | "rights"
  | "synthetic"
  | "notLive"
  | "noPayment"
  | "prospective"
  | "notPartner"
  | "continueProvider"
  | "simulateSuccess"
  | "simulateFailure"
  | "simulateRefund"
  | "checkoutBlocked"
  | "originalsDraft"
  | "openCourse"
  | "openProduct"
  | "backHub"
  | "catalog"
  | "searchFilter"
  | "learningHome"
  | "learningHomeLead"
  | "studentRoster"
  | "studentRosterLead"
  | "studentProfile"
  | "studentDashboard"
  | "studentE2e"
  | "openStudent"
  | "openInstructor"
  | "instructorRoster"
  | "instructorProfile"
  | "instructorDashboard"
  | "courseCreation"
  | "instructorAnalytics"
  | "instructorFinancial"
  | "enrollmentModels"
  | "enrollSandbox"
  | "freeEnrollment"
  | "paidLearning"
  | "paidFirst"
  | "mockPayment"
  | "simulatePending"
  | "noCardFields"
  | "openLesson"
  | "nextLesson"
  | "markLessonComplete"
  | "lessonComplete"
  | "quiz"
  | "submitQuiz"
  | "quizPassed"
  | "quizFailed"
  | "exercise"
  | "submitExercise"
  | "exerciseSaved"
  | "finalAssessment"
  | "submitAssessment"
  | "assessmentPassed"
  | "assessmentFailed"
  | "noAccreditation"
  | "aiTutor"
  | "askTutor"
  | "tutorDenied"
  | "certificate"
  | "certificateRules"
  | "progress"
  | "whatNext"
  | "bodyMissing"
  | "authoredSourceLanguage"
  | "unknownCourse"
  | "unknownLesson"
  | "unknownStudent"
  | "unknownInstructor"
  | "syntheticPerson"
  | "createDraft"
  | "advanceDraft"
  | "creationLead"
  | "adminLead"
  | "prospectivePartners"
  | "prospectiveStay"
  | "tryActivate"
  | "qualityJudgments";

type Catalog = Record<SandboxMessageKey, string>;

const en: Catalog = {
  title: "Business preview sandbox",
  subtitle: "Private Product Owner preview · synthetic data only",
  badge: "SANDBOX",
  banner:
    "DEMO · SANDBOX · SYNTHETIC DATA · NOT LIVE · NO REAL PAYMENT. Prospective names are not UMTUBA partners.",
  deniedTitle: "This sandbox is private",
  deniedBody:
    "Sign in as a platform administrator, or open the operator enter path with the configured server token. Anonymous visitors are denied. STORE_DEMO_PREVIEW=1 is not enough.",
  signIn: "Sign in",
  hub: "Overview",
  learning: "Learning",
  learningStudent: "Student",
  learningInstructor: "Instructor",
  learningAdmin: "Learning admin",
  learningPartners: "Learning partners",
  store: "Store",
  storeCart: "Cart",
  storeCheckout: "Checkout",
  storeOrders: "Orders",
  storeSeller: "Seller",
  storePartners: "Commerce partners",
  commercial: "Commercial model",
  rights: "Rights",
  synthetic: "SYNTHETIC DATA",
  notLive: "NOT LIVE",
  noPayment: "NO REAL PAYMENT",
  prospective: "PROSPECTIVE PARTNER",
  notPartner: "NOT AN UMTUBA PARTNER",
  continueProvider: "Continue with provider (sandbox)",
  simulateSuccess: "Simulate success",
  simulateFailure: "Simulate failure",
  simulateRefund: "Simulate refund",
  checkoutBlocked: "Production checkout is off. PAYMENT_MODE=SANDBOX.",
  originalsDraft: "UMTUBA Originals remain DRAFT and are not in the public catalog.",
  openCourse: "Open course",
  openProduct: "Open product",
  backHub: "Back to hub",
  catalog: "Catalog",
  searchFilter: "Search and filter",
  learningHome: "Learning sandbox",
  learningHomeLead:
    "Private executable preview. Synthetic students and instructors only. Production /learning is unchanged.",
  studentRoster: "Synthetic students",
  studentRosterLead: "20–30 demo students. Click a profile, then the dashboard, then a course.",
  studentProfile: "Student profile",
  studentDashboard: "Student dashboard",
  studentE2e: "Clickable student path",
  openStudent: "Open student",
  openInstructor: "Open instructor",
  instructorRoster: "Synthetic instructors",
  instructorProfile: "Instructor profile",
  instructorDashboard: "Instructor dashboard",
  courseCreation: "Course creation",
  instructorAnalytics: "Instructor analytics",
  instructorFinancial: "Instructor financial demo",
  enrollmentModels: "Enrollment models",
  enrollSandbox: "Sandbox enroll",
  freeEnrollment: "Free",
  paidLearning: "Paid sandbox",
  paidFirst: "Paid preview. Mock payment SUCCESS is required before lessons.",
  mockPayment: "Mock payment",
  simulatePending: "Simulate pending",
  noCardFields: "No card number is requested or stored. REAL_CHARGE_POSSIBLE=NO.",
  openLesson: "Open lesson",
  nextLesson: "Next lesson",
  markLessonComplete: "Mark lesson complete",
  lessonComplete: "Lesson complete",
  quiz: "Quiz",
  submitQuiz: "Submit quiz",
  quizPassed: "Correct.",
  quizFailed: "Not yet. Try again.",
  exercise: "Exercise",
  submitExercise: "Save exercise",
  exerciseSaved: "Exercise saved in sandbox state.",
  finalAssessment: "Final assessment",
  submitAssessment: "Submit assessment",
  assessmentPassed: "Passed this sandbox check.",
  assessmentFailed: "Below 70%. Not accreditation.",
  noAccreditation: "Not accreditation. Not a professional license.",
  aiTutor: "AI Tutor (sandbox)",
  askTutor: "Ask the local tutor",
  tutorDenied: "AI Tutor is denied for this course.",
  certificate: "Certificate",
  certificateRules:
    "UMTUBA Originals can preview an UMTUBA-owned sandbox certificate. Partner previews use the demo provider. External courses issue nothing. Coursera, Udemy, and edX certificates are never issued.",
  progress: "Progress",
  whatNext: "What next",
  bodyMissing: "Lesson body is not authored. The sandbox will not invent it.",
  authoredSourceLanguage: "Authored lesson text stays in its source language.",
  unknownCourse: "Unknown sandbox course.",
  unknownLesson: "Unknown sandbox lesson.",
  unknownStudent: "Unknown sandbox student.",
  unknownInstructor: "Unknown sandbox instructor.",
  syntheticPerson: "Synthetic person. Not a real learner.",
  createDraft: "Create draft",
  advanceDraft: "Advance lifecycle",
  creationLead: "DRAFT → REVIEW → SANDBOX_ONLY. Never enters the public /learning catalog.",
  adminLead: "Executable admin labels only. Prospective partners cannot become ACTIVE.",
  prospectivePartners: "Prospective partners",
  prospectiveStay: "Status stays PROSPECTIVE. Not a contract.",
  tryActivate: "Try activate (must fail)",
  qualityJudgments: "Honest product judgments",
};

const ar: Catalog = {
  title: "صندوق معاينة الأعمال",
  subtitle: "معاينة خاصة لمالك المنتج · بيانات اصطناعية فقط",
  badge: "صندوق تجريبي",
  banner:
    "تجريبي · صندوق رمل · بيانات اصطناعية · غير مباشر · لا دفعة حقيقية. الأسماء المحتملة ليست شركاء UMTUBA.",
  deniedTitle: "هذا الصندوق خاص",
  deniedBody:
    "سجّل الدخول كمسؤول منصة، أو افتح مسار المشغّل بالرمز المضبوط على الخادم. الزوار المجهولون مرفوضون. STORE_DEMO_PREVIEW=1 لا يكفي.",
  signIn: "تسجيل الدخول",
  hub: "نظرة عامة",
  learning: "التعلّم",
  learningStudent: "طالب",
  learningInstructor: "مدرب",
  learningAdmin: "إدارة التعلّم",
  learningPartners: "شركاء التعلّم",
  store: "المتجر",
  storeCart: "السلة",
  storeCheckout: "الدفع",
  storeOrders: "الطلبات",
  storeSeller: "البائع",
  storePartners: "شركاء التجارة",
  commercial: "النموذج التجاري",
  rights: "الحقوق",
  synthetic: "بيانات اصطناعية",
  notLive: "غير مباشر",
  noPayment: "لا دفعة حقيقية",
  prospective: "شريك محتمل",
  notPartner: "ليس شريكاً في UMTUBA",
  continueProvider: "متابعة مع المزوّد (صندوق تجريبي)",
  simulateSuccess: "محاكاة نجاح",
  simulateFailure: "محاكاة فشل",
  simulateRefund: "محاكاة استرداد",
  checkoutBlocked: "دفع الإنتاج متوقف. وضع الدفع = صندوق تجريبي.",
  originalsDraft: "أصول UMTUBA تبقى مسودة وليست في الكتالوج العام.",
  openCourse: "فتح الدورة",
  openProduct: "فتح المنتج",
  backHub: "العودة للنظرة العامة",
  catalog: "الكتالوج",
  searchFilter: "بحث وتصفية",
  learningHome: "صندوق التعلّم",
  learningHomeLead:
    "معاينة تنفيذية خاصة. طلاب ومدربون اصطناعيون فقط. منتج /learning الحقيقي لم يتغيّر.",
  studentRoster: "طلاب اصطناعيون",
  studentRosterLead: "٢٠–٣٠ طالباً تجريبياً. افتح ملفاً ثم لوحة ثم دورة.",
  studentProfile: "ملف الطالب",
  studentDashboard: "لوحة الطالب",
  studentE2e: "مسار طالب قابل للنقر",
  openStudent: "فتح الطالب",
  openInstructor: "فتح المدرب",
  instructorRoster: "مدربون اصطناعيون",
  instructorProfile: "ملف المدرب",
  instructorDashboard: "لوحة المدرب",
  courseCreation: "إنشاء دورة",
  instructorAnalytics: "تحليلات المدرب",
  instructorFinancial: "عرض مالي للمدرب",
  enrollmentModels: "نماذج التسجيل",
  enrollSandbox: "تسجيل في الصندوق",
  freeEnrollment: "مجاني",
  paidLearning: "مدفوع في الصندوق",
  paidFirst: "معاينة مدفوعة. يلزم نجاح الدفع التجريبي قبل الدروس.",
  mockPayment: "دفع تجريبي",
  simulatePending: "محاكاة انتظار",
  noCardFields: "لا يُطلب رقم بطاقة ولا يُحفظ. لا يمكن تحصيل حقيقي.",
  openLesson: "فتح الدرس",
  nextLesson: "الدرس التالي",
  markLessonComplete: "تعليم الدرس مكتملاً",
  lessonComplete: "الدرس مكتمل",
  quiz: "اختبار قصير",
  submitQuiz: "إرسال الاختبار",
  quizPassed: "صحيح.",
  quizFailed: "ليس بعد. أعد المحاولة.",
  exercise: "تمرين",
  submitExercise: "حفظ التمرين",
  exerciseSaved: "حُفظ التمرين في حالة الصندوق.",
  finalAssessment: "التقييم النهائي",
  submitAssessment: "إرسال التقييم",
  assessmentPassed: "نجحت في فحص الصندوق.",
  assessmentFailed: "أقل من ٧٠٪. ليست اعتماداً مهنياً.",
  noAccreditation: "ليست اعتماداً مهنياً وليست رخصة.",
  aiTutor: "المعلّم الذكي (صندوق)",
  askTutor: "اسأل المعلّم المحلي",
  tutorDenied: "المعلّم الذكي مرفوض لهذه الدورة.",
  certificate: "الشهادة",
  certificateRules:
    "أصول UMTUBA تعرض شهادة صندوق يملكها UMTUBA. معاينات الشريك تستخدم المزود التجريبي. الدورات الخارجية لا تُصدر شيئاً. شهادات كورسيرا ويوديمي وإدكس لا تُصدر أبداً.",
  progress: "التقدّم",
  whatNext: "ماذا بعد",
  bodyMissing: "نص الدرس غير مؤلَّف. الصندوق لن يخترعه.",
  authoredSourceLanguage: "نص الدرس المؤلَّف يبقى بلغته الأصلية.",
  unknownCourse: "دورة صندوق غير معروفة.",
  unknownLesson: "درس صندوق غير معروف.",
  unknownStudent: "طالب صندوق غير معروف.",
  unknownInstructor: "مدرب صندوق غير معروف.",
  syntheticPerson: "شخص اصطناعي. ليس متعلماً حقيقياً.",
  createDraft: "إنشاء مسودة",
  advanceDraft: "تقديم دورة الحياة",
  creationLead: "مسودة → مراجعة → صندوق فقط. لا تدخل كتالوج /learning العام.",
  adminLead: "تسميات إدارة تنفيذية فقط. الشركاء المحتملون لا يصبحون نشطين.",
  prospectivePartners: "شركاء محتملون",
  prospectiveStay: "الحالة تبقى محتملاً. ليست عقداً.",
  tryActivate: "محاولة تفعيل (يجب أن تفشل)",
  qualityJudgments: "أحكام منتج صادقة",
};

const fr: Catalog = {
  ...en,
  title: "Bac à sable aperçu métier",
  subtitle: "Aperçu privé Product Owner · données synthétiques seulement",
  badge: "SANDBOX",
  deniedTitle: "Ce bac à sable est privé",
  signIn: "Connexion",
  hub: "Aperçu",
  learning: "Apprentissage",
  store: "Boutique",
};

const es: Catalog = {
  ...en,
  title: "Sandbox de vista de negocio",
  subtitle: "Vista privada del Product Owner · solo datos sintéticos",
  badge: "SANDBOX",
  deniedTitle: "Este sandbox es privado",
  signIn: "Iniciar sesión",
  hub: "Resumen",
  learning: "Aprendizaje",
  store: "Tienda",
};

const de: Catalog = {
  ...en,
  title: "Business-Vorschau-Sandbox",
  subtitle: "Private Product-Owner-Vorschau · nur synthetische Daten",
  badge: "SANDBOX",
  deniedTitle: "Diese Sandbox ist privat",
  signIn: "Anmelden",
  hub: "Übersicht",
  learning: "Lernen",
  store: "Shop",
};

const pt: Catalog = {
  ...en,
  title: "Sandbox de pré-visualização de negócio",
  subtitle: "Pré-visualização privada do Product Owner · só dados sintéticos",
  badge: "SANDBOX",
  deniedTitle: "Este sandbox é privado",
  signIn: "Entrar",
  hub: "Visão geral",
  learning: "Aprendizagem",
  store: "Loja",
};

const CATALOGS: Record<AppLocale, Catalog> = { ar, en, fr, es, de, pt };

export function sandboxMessages(locale: AppLocale): Catalog {
  return CATALOGS[locale] ?? en;
}

export function sandboxT(locale: AppLocale, key: SandboxMessageKey): string {
  return sandboxMessages(locale)[key] ?? en[key];
}

export function sandboxDirection(locale: AppLocale): TextDirection {
  return getLocaleDirection(locale);
}

export const SANDBOX_MESSAGE_KEYS = Object.keys(en) as SandboxMessageKey[];
