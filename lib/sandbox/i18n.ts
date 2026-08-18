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
  | "backHub";

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
