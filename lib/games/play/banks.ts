import { shuffled } from "./engine";

export const CHOICE_TAGS = ["أ", "ب", "ج", "د"] as const;

export type QuizItem = {
  prompt: string;
  choices: string[];
  correct: number;
  why?: string;
};

export const LESSON_QUIZ: QuizItem[] = [
  {
    prompt: "شو الفرق الأساسي بين نموذج اللغة الكبير والبرنامج العادي؟",
    choices: [
      "النموذج بيتعلّم من أمثلة بدل ما ينفّذ قواعد مكتوبة",
      "النموذج أسرع في التنفيذ",
      "النموذج ما بيحتاج إنترنت",
      "البرنامج العادي ما بيقدر يتعامل مع نصوص",
    ],
    correct: 0,
    why: "البرنامج العادي بينفّذ خطوات كتبها مبرمج. النموذج بيستنتج الأنماط من كمية ضخمة من الأمثلة.",
  },
  {
    prompt: "إيش المقصود بـ«توكن» عند التعامل مع النماذج؟",
    choices: [
      "كلمة مرور للوصول للخدمة",
      "قطعة صغيرة من النص، أصغر من الكلمة غالباً",
      "وحدة قياس السرعة",
      "نوع من أنواع الملفات",
    ],
    correct: 1,
    why: "النموذج بقسّم النص لقطع صغيرة اسمها توكن. الفاتورة والحد الأقصى بينحسبوا بالتوكن.",
  },
  {
    prompt: "ليش بيُنصح تكون التعليمات للنموذج محددة ومفصّلة؟",
    choices: [
      "لأن التعليمات الطويلة أرخص",
      "لأن النموذج بيرفض التعليمات القصيرة",
      "لأن الغموض بيخلي النموذج يختار تفسيراً قد لا يكون المقصود",
      "لأن هيك بتشتغل كل البرامج",
    ],
    correct: 2,
    why: "لما يكون الطلب غامض، النموذج بيملأ الفراغ باحتمال معقول — مش بالضرورة المقصود.",
  },
  {
    prompt: "شو أول شي لازم تتأكد منه قبل ما تنشر تطبيقاً مبنياً على نموذج؟",
    choices: [
      "إنه التصميم جذاب",
      "إنه في آلية للتعامل مع المخرجات الخاطئة",
      "إنه بيدعم كل اللغات",
      "إنه أسرع من المنافسين",
    ],
    correct: 1,
    why: "النموذج بيغلط أحياناً. التطبيق الجاهز فيه تحقق ومراجعة، مش افتراض إن الجواب دايماً صح.",
  },
  {
    prompt: "إيش معنى إنه النموذج «ما بيتذكّر» المحادثات السابقة افتراضياً؟",
    choices: [
      "إنه بينسى كل شي بعد كل كلمة",
      "إنه لازم توصله السياق المطلوب مع كل طلب",
      "إنه ما بيقدر يشتغل أكثر من مرة",
      "إنه بيحتاج إعادة تدريب كل يوم",
    ],
    correct: 1,
    why: "كل طلب بيوصل للنموذج لحاله. السياق لازم ينرسل مع الطلب.",
  },
  {
    prompt: "متى يكون استخدام النموذج خياراً غير مناسب؟",
    choices: [
      "لما تكون المهمة إبداعية",
      "لما يكون المطلوب نتيجة دقيقة ومحددة يقدر يحسبها برنامج عادي",
      "لما يكون النص طويلاً",
      "لما يكون المستخدم مبتدئاً",
    ],
    correct: 1,
    why: "حساب فاتورة أو تحويل عملة برنامج عادي بيعملهم بدقة. النموذج للنص والفهم والغموض.",
  },
];

export const QUICK_Q: QuizItem[] = [
  { prompt: "ما عاصمة السعودية؟", choices: ["الرياض", "جدّة", "الدمام", "مكة"], correct: 0, why: "الرياض هي العاصمة الإدارية." },
  { prompt: "كم ضلع للمثلث؟", choices: ["٢", "٥", "٣", "٤"], correct: 2, why: "المثلث له ثلاثة أضلاع." },
  { prompt: "أي كوكب أقرب للشمس؟", choices: ["الزهرة", "عطارد", "الأرض", "المريخ"], correct: 1, why: "عطارد هو الأقرب." },
  { prompt: "لغة HTML تُستخدم لـ", choices: ["بناء صفحات الويب", "الرسم ثلاثي الأبعاد", "قواعد البيانات", "الصوت"], correct: 0, why: "HTML هي هيكل الصفحة." },
  { prompt: "١ كيلومتر كم متر؟", choices: ["١٠", "١٠٠", "٥٠٠", "١٠٠٠"], correct: 3, why: "الكيلومتر ألف متر." },
  { prompt: "أين يقع نهر النيل؟", choices: ["آسيا", "أفريقيا", "أوروبا", "أمريكا"], correct: 1, why: "النيل يجري في أفريقيا." },
  { prompt: "ما ناتج ٧ × ٨؟", choices: ["٥٤", "٤٨", "٥٦", "٦٤"], correct: 2, why: "٧ × ٨ = ٥٦." },
  { prompt: "أي غاز نتنفسه أساساً؟", choices: ["الأكسجين", "الهيليوم", "النيون", "الأوزون"], correct: 0, why: "الأكسجين ضروري للتنفس." },
  { prompt: "كم يوم في السنة الكبيسة؟", choices: ["٣٦٤", "٣٦٦", "٣٦٥", "٣٦٠"], correct: 1, why: "السنة الكبيسة ٣٦٦ يوماً." },
  { prompt: "أول حرف في الأبجدية العربية؟", choices: ["أ", "ب", "ت", "ث"], correct: 0, why: "الألف هو الأول." },
  { prompt: "وحدة قياس التيار الكهربائي؟", choices: ["فولت", "واط", "أمبير", "أوم"], correct: 2, why: "الأمبير يقيس شدة التيار." },
  { prompt: "أكبر محيط على الأرض؟", choices: ["الأطلسي", "الهندي", "المتجمد", "الهادئ"], correct: 3, why: "المحيط الهادئ هو الأكبر." },
];

export const VOCAB = [
  { en: "river", ar: "نهر", wrong: ["جبل", "صحراء", "غابة"] },
  { en: "market", ar: "سوق", wrong: ["مدرسة", "مطار", "مكتبة"] },
  { en: "teacher", ar: "معلّم", wrong: ["طالب", "طبيب", "طاهٍ"] },
  { en: "window", ar: "نافذة", wrong: ["باب", "سقف", "جدار"] },
  { en: "morning", ar: "صباح", wrong: ["ليل", "ظهر", "أمس"] },
  { en: "friend", ar: "صديق", wrong: ["عدو", "غريب", "جار"] },
  { en: "book", ar: "كتاب", wrong: ["قلم", "ورقة", "طاولة"] },
  { en: "water", ar: "ماء", wrong: ["نار", "هواء", "تراب"] },
  { en: "city", ar: "مدينة", wrong: ["قرية", "جزيرة", "وادي"] },
  { en: "fast", ar: "سريع", wrong: ["بطيء", "ثقيل", "هادئ"] },
];

export const BLANKS = [
  { s: "الماء يغلي عند ___ درجة.", a: "١٠٠", o: ["٩٠", "١٠٠", "٨٠", "١٢٠"] },
  { s: "الأرض تدور حول ___.", a: "الشمس", o: ["القمر", "المريخ", "الشمس", "زحل"] },
  { s: "في الأسبوع ___ أيام.", a: "سبعة", o: ["ستة", "سبعة", "ثمانية", "خمسة"] },
  { s: "لون السماء في النهار عادةً ___.", a: "أزرق", o: ["أخضر", "أزرق", "ذهبي", "أسود"] },
  { s: "نكتب الكود في ملف ثم نقوم بـ ___.", a: "التشغيل", o: ["الطبخ", "التشغيل", "السفر", "النوم"] },
  { s: "أم توبا منصة لـ ___ والفيديو.", a: "المشاركة", o: ["المشاركة", "الطبخ", "الطيران", "الزراعة"] },
  { s: "بعد الشتاء يأتي فصل ___.", a: "الربيع", o: ["الصيف", "الخريف", "الربيع", "الشتاء"] },
  { s: "الهاتف يحتاج إلى ___ ليعمل.", a: "طاقة", o: ["ماء", "طاقة", "هواء", "ملح"] },
];

export const STEPS = [
  { title: "صنع الشاي", titleEn: "Make tea", steps: ["سخّن الماء", "ضع الشاي في الإبريق", "اسكب الماء", "انتظر دقيقتين", "قدّم الكأس"] },
  { title: "نشر فيديو", titleEn: "Post a video", steps: ["صوّر المقطع", "راجع الجودة", "أضف العنوان", "ارفع الملف", "انشر"] },
  { title: "غسل اليدين", titleEn: "Wash your hands", steps: ["بلّل اليدين", "ضع الصابون", "افرك ٢٠ ثانية", "اشطف", "نشّف"] },
  { title: "إرسال رسالة", titleEn: "Send a message", steps: ["افتح المحادثة", "اكتب الرسالة", "راجع النص", "اضغط إرسال", "تأكد أنها وصلت"] },
  { title: "زراعة بذرة", titleEn: "Plant a seed", steps: ["أحضر الأصيص", "ضع التربة", "ازرع البذرة", "اسقِ التربة", "ضعها في الضوء"] },
  { title: "شحن الهاتف", titleEn: "Charge a phone", steps: ["أوصل الشاحن بالمقبس", "أوصل السلك بالهاتف", "انتظر اكتمال الشحن", "افصل السلك عن الهاتف", "اسحب الشاحن من المقبس"] },
  { title: "غسل الأطباق", titleEn: "Wash the dishes", steps: ["اجمع الأطباق", "أضف ماءً وصابوناً", "افرك الأطباق", "اشطف الصابون", "ضعها لتجف"] },
  { title: "عبور الشارع", titleEn: "Cross the street", steps: ["قف على الرصيف", "انظر يميناً ويساراً", "انتظر خلو الطريق", "امشِ على الممر", "اكمل إلى الرصيف الآخر"] },
];

export function stepsInOrder(order: readonly string[], truth: readonly string[]): boolean {
  return order.length === truth.length && truth.length > 0 && order.every((step, idx) => step === truth[idx]);
}

export type StepLine = { n: number; text: string; wrong: boolean };

export type StepReview = {
  hit: boolean;
  yours: StepLine[];
  correct: StepLine[];
};

/** What stays on screen after confirm. A wrong try keeps both lists until Next. */
export function reviewOrder(attempt: readonly string[], truth: readonly string[]): StepReview {
  return {
    hit: stepsInOrder(attempt, truth),
    yours: attempt.map((text, idx) => ({ n: idx + 1, text, wrong: text !== truth[idx] })),
    correct: truth.map((text, idx) => ({ n: idx + 1, text, wrong: false })),
  };
}

export type OrderPhase = "play" | "review";

export function orderPhaseAfterConfirm(phase: OrderPhase): OrderPhase {
  if (phase === "review") return "review";
  return "review";
}

export function orderPhaseAfterNext(phase: OrderPhase): "stay" | "advance" {
  return phase === "review" ? "advance" : "stay";
}

export const TERMS = [
  { t: "الخوارزمية", e: "Algorithm", d: "خطوات مرتّبة لحل مسألة" },
  { t: "المتغيّر", e: "Variable", d: "مكان في الذاكرة يحمل قيمة" },
  { t: "البتّ", e: "Bit", d: "أصغر وحدة معلومات رقمية" },
  { t: "المتصفح", e: "Browser", d: "برنامج لعرض صفحات الويب" },
  { t: "كلمة المرور", e: "Password", d: "سرّ يدخل به الحساب" },
  { t: "السحابة", e: "Cloud", d: "خوادم بعيدة تخزّن ملفاتك" },
];

export const HANG_WORDS = [
  { w: "القدس", h: "مدينة فلسطينية فيها قبّة ذهبية" },
  { w: "زيتون", h: "شجرة معمّرة، ورمز فلسطيني" },
  { w: "بحر", h: "ماء مالح واسع" },
  { w: "كتاب", h: "بتقرأه صفحة صفحة" },
  { w: "قمر", h: "بيضوي بالليل وبيدور حوالينا" },
  { w: "مدرسة", h: "مكان التعلّم الأول" },
  { w: "خريطة", h: "بتوريك الطريق والأماكن" },
  { w: "نجمة", h: "نقطة ضوء بعيدة بالسما" },
  { w: "شجرة", h: "جذع وأغصان وورق" },
  { w: "صحراء", h: "رمال ومساحة بلا ماء" },
];

export const TYPE_PHRASES = [
  "مرحباً بك في أم توبا",
  "العلم نور والجهل ظلام",
  "اكتب بسرعة ودقّة في نفس الوقت",
  "الألعاب تعلّم الصبر والتركيز",
  "كل حرف في مكانه الصحيح",
];

export const ARABIC_LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");

export function normArabicLetter(ch: string): string {
  return ({ أ: "ا", إ: "ا", آ: "ا", ء: "ا", ؤ: "و", ئ: "ي", ى: "ي", ة: "ه" }[ch] ?? ch);
}

export type WorldCity = {
  id: string;
  city: string;
  country: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  scene: string;
  hint: string;
};

export const WORLD_CITIES: WorldCity[] = [
  { id: "jerusalem", city: "القدس", country: "فلسطين", x: 214.2, y: 58.2, lat: 31.778, lng: 35.235, scene: "dome", hint: "قبّة ذهبية ومدينة على تلال" },
  { id: "cairo", city: "القاهرة", country: "مصر", x: 208.4, y: 62.8, lat: 30.044, lng: 31.236, scene: "pyramid", hint: "أهرامات ونهر طويل" },
  { id: "dubai", city: "دبي", country: "الإمارات", x: 235.2, y: 64.5, lat: 25.205, lng: 55.271, scene: "tower", hint: "برج أطول من أي شي حواليه" },
  { id: "paris", city: "باريس", country: "فرنسا", x: 182.3, y: 42.5, lat: 48.857, lng: 2.352, scene: "lattice", hint: "برج حديدي مشبّك" },
  { id: "tokyo", city: "طوكيو", country: "اليابان", x: 319.7, y: 54.5, lat: 35.682, lng: 139.76, scene: "neon", hint: "لافتات مضيئة بالليل" },
  { id: "newyork", city: "نيويورك", country: "أمريكا", x: 105.9, y: 49.3, lat: 40.713, lng: -74.006, scene: "skyline", hint: "ناطحات سحاب وتمثال على جزيرة" },
  { id: "marrakesh", city: "مراكش", country: "المغرب", x: 172.0, y: 58.5, lat: 31.63, lng: -7.981, scene: "souq", hint: "أسواق بأقواس ومدينة حمرا" },
  { id: "amman", city: "عمّان", country: "الأردن", x: 215.9, y: 58.0, lat: 31.953, lng: 35.91, scene: "hills", hint: "مدينة على تلال وبيوت بيضا" },
  { id: "riyadh", city: "الرياض", country: "السعودية", x: 226.7, y: 65.3, lat: 24.714, lng: 46.675, scene: "tower", hint: "أبراج وسط صحرا مفتوحة" },
  { id: "rome", city: "روما", country: "إيطاليا", x: 192.5, y: 48.2, lat: 41.89, lng: 12.492, scene: "arena", hint: "مدرّج دائري قديم" },
  { id: "nairobi", city: "نيروبي", country: "كينيا", x: 216.8, y: 91.3, lat: -1.286, lng: 36.817, scene: "savanna", hint: "سهول مفتوحة وأشجار مسطّحة" },
];

export const WORLD_LANDMARKS = [
  { id: "dome", name: "قبة الصخرة", city: "jerusalem", scene: "dome", fact: "قبّتها الذهبية علامة القدس." },
  { id: "pyramid", name: "أهرامات الجيزة", city: "cairo", scene: "pyramid", fact: "الهرم الأكبر ضلّ أطول بناء صناعي قروناً." },
  { id: "lattice", name: "برج إيفل", city: "paris", scene: "lattice", fact: "انبنى كمدخل لمعرض مؤقت." },
  { id: "arena", name: "الكولوسيوم", city: "rome", scene: "arena", fact: "كان بيستوعب عشرات الآلاف." },
  { id: "tower", name: "برج خليفة", city: "dubai", scene: "tower", fact: "أطول مبنى في العالم." },
  { id: "neon", name: "تقاطع شيبويا", city: "tokyo", scene: "neon", fact: "من أزحم تقاطعات المشاة." },
];

export const FLAGS = [
  { id: "jp", name: "اليابان" },
  { id: "fr", name: "فرنسا" },
  { id: "de", name: "ألمانيا" },
  { id: "it", name: "إيطاليا" },
  { id: "tr", name: "تركيا" },
  { id: "ps", name: "فلسطين" },
  { id: "eg", name: "مصر" },
  { id: "sa", name: "السعودية" },
  { id: "ae", name: "الإمارات" },
  { id: "se", name: "السويد" },
  { id: "ch", name: "سويسرا" },
  { id: "ma", name: "المغرب" },
] as const;

export const DIST_CITIES = [
  { id: "riyadh", city: "الرياض", country: "السعودية", iso: "sa", lat: 24.714, lng: 46.675 },
  { id: "jeddah", city: "جدّة", country: "السعودية", iso: "sa", lat: 21.543, lng: 39.173 },
  { id: "cairo", city: "القاهرة", country: "مصر", iso: "eg", lat: 30.044, lng: 31.236 },
  { id: "alexandria", city: "الإسكندرية", country: "مصر", iso: "eg", lat: 31.2, lng: 29.919 },
  { id: "amman", city: "عمّان", country: "الأردن", iso: "jo", lat: 31.945, lng: 35.928 },
  { id: "beirut", city: "بيروت", country: "لبنان", iso: "lb", lat: 33.894, lng: 35.502 },
  { id: "dubai", city: "دبي", country: "الإمارات", iso: "ae", lat: 25.205, lng: 55.271 },
  { id: "istanbul", city: "إسطنبول", country: "تركيا", iso: "tr", lat: 41.008, lng: 28.978 },
  { id: "paris", city: "باريس", country: "فرنسا", iso: "fr", lat: 48.857, lng: 2.352 },
  { id: "tokyo", city: "طوكيو", country: "اليابان", iso: "jp", lat: 35.676, lng: 139.65 },
  { id: "berlin", city: "برلين", country: "ألمانيا", iso: "de", lat: 52.52, lng: 13.405 },
  { id: "rome", city: "روما", country: "إيطاليا", iso: "it", lat: 41.903, lng: 12.496 },
];

const DIST: Record<string, number> = {
  "riyadh|jeddah": 949,
  "riyadh|cairo": 1970,
  "riyadh|amman": 1580,
  "riyadh|dubai": 870,
  "jeddah|cairo": 1220,
  "cairo|alexandria": 180,
  "cairo|amman": 500,
  "amman|beirut": 240,
  "dubai|istanbul": 3010,
  "paris|berlin": 880,
  "tokyo|paris": 9710,
  "tokyo|dubai": 7950,
  "berlin|rome": 1180,
  "istanbul|berlin": 1740,
  "beirut|paris": 3190,
  "rome|cairo": 2130,
  "jeddah|istanbul": 2340,
  "riyadh|tokyo": 8580,
  "dubai|paris": 5240,
  "amman|rome": 2250,
};

export function cityDistance(a: string, b: string): number {
  return DIST[`${a}|${b}`] ?? DIST[`${b}|${a}`] ?? 0;
}

export const COUNTRIES = [
  { id: "sa", name: "السعودية", nameEn: "Saudi Arabia", km2: 2149690 },
  { id: "eg", name: "مصر", nameEn: "Egypt", km2: 1002450 },
  { id: "tr", name: "تركيا", nameEn: "Turkey", km2: 783562 },
  { id: "fr", name: "فرنسا", nameEn: "France", km2: 551695 },
  { id: "de", name: "ألمانيا", nameEn: "Germany", km2: 357114 },
  { id: "jp", name: "اليابان", nameEn: "Japan", km2: 377975 },
  { id: "it", name: "إيطاليا", nameEn: "Italy", km2: 301340 },
  { id: "ae", name: "الإمارات", nameEn: "United Arab Emirates", km2: 83600 },
  { id: "jo", name: "الأردن", nameEn: "Jordan", km2: 89342 },
  { id: "lb", name: "لبنان", nameEn: "Lebanon", km2: 10452 },
  { id: "ps", name: "فلسطين", nameEn: "Palestine", km2: 6220 },
  { id: "se", name: "السويد", nameEn: "Sweden", km2: 450295 },
];

export type DemoProduct = {
  id: string;
  name: string;
  nameEn: string;
  cat: string;
  kind: string;
  price: number;
};

export const STORE_PRODUCTS: DemoProduct[] = [
  { id: "bag", name: "حقيبة يومية", nameEn: "Everyday bag", cat: "إكسسوار", kind: "bag", price: 189 },
  { id: "phone", name: "غطاء هاتف", nameEn: "Phone case", cat: "إلكترونيات", kind: "phone", price: 45 },
  { id: "cup", name: "كوب حراري", nameEn: "Travel cup", cat: "منزل", kind: "cup", price: 72 },
  { id: "book", name: "دفتر ملاحظات", nameEn: "Notebook", cat: "قرطاسية", kind: "book", price: 28 },
  { id: "shoe", name: "حذاء رياضي", nameEn: "Sports shoe", cat: "ملابس", kind: "shoe", price: 310 },
  { id: "lamp", name: "مصباح مكتب", nameEn: "Desk lamp", cat: "منزل", kind: "lamp", price: 145 },
  { id: "watch", name: "ساعة يد", nameEn: "Wrist watch", cat: "إكسسوار", kind: "watch", price: 420 },
  { id: "plant", name: "نبتة صغيرة", nameEn: "Small plant", cat: "منزل", kind: "plant", price: 55 },
];

export const DISCOUNT_PERCENTS = [10, 15, 20, 25, 30, 35, 40, 50] as const;

/** Old and sale prices where (old − sale) is exactly `pct` percent of the old price. */
export function exactDiscountPrices(anchor: number, pct: number): { old: number; sale: number } {
  const keep = 100 - pct;
  for (let delta = 0; delta <= 40; delta += 1) {
    const candidates = delta === 0 ? [anchor] : [anchor - delta, anchor + delta];
    for (const old of candidates) {
      if (old < 20) continue;
      if ((old * keep) % 100 !== 0) continue;
      const sale = (old * keep) / 100;
      if (sale > 0 && sale < old) return { old, sale };
    }
  }
  return { old: 100, sale: 100 - pct };
}

export const PRICE_CATALOG = [
  { n: "حقيبة جلد يدوية", e: "Leather bag", c: "أزياء", p: 340, k: "bag" },
  { n: "سمّاعات لاسلكية", e: "Wireless headphones", c: "إلكترونيات", p: 520, k: "phone" },
  { n: "طقم فناجين فخّار", e: "Clay cups", c: "البيت", p: 130, k: "cup" },
  { n: "كورس تصوير كامل", e: "Photo course", c: "تعليم", p: 260, k: "book" },
  { n: "حذاء رياضي", e: "Sports shoe", c: "رياضة", p: 410, k: "shoe" },
  { n: "مصباح طاولة خشب", e: "Wood lamp", c: "البيت", p: 185, k: "lamp" },
  { n: "ساعة كلاسيكية", e: "Classic watch", c: "أزياء", p: 760, k: "watch" },
  { n: "نبتة داخلية كبيرة", e: "Indoor plant", c: "البيت", p: 95, k: "plant" },
];

export const BASKET_ITEMS = [
  { n: "حقيبة جلد", e: "Leather bag", p: 340, k: "bag" },
  { n: "سمّاعات", e: "Headphones", p: 520, k: "phone" },
  { n: "طقم فناجين", e: "Cup set", p: 130, k: "cup" },
  { n: "كورس تصوير", e: "Photo course", p: 260, k: "book" },
  { n: "حذاء رياضي", e: "Sports shoe", p: 410, k: "shoe" },
  { n: "مصباح خشب", e: "Wood lamp", p: 185, k: "lamp" },
  { n: "ساعة كلاسيك", e: "Classic watch", p: 760, k: "watch" },
  { n: "نبتة كبيرة", e: "Large plant", p: 95, k: "plant" },
  { n: "وشاح صوف", e: "Wool scarf", p: 120, k: "bag" },
  { n: "دفتر جلد", e: "Leather notebook", p: 75, k: "book" },
  { n: "كوب معزول", e: "Insulated cup", p: 145, k: "cup" },
  { n: "حزام جلد", e: "Leather belt", p: 210, k: "shoe" },
];

export const WHEEL_SLICES = [5, 10, 15, 20, 25, 30];

export function pickQuiz(bank: readonly QuizItem[], count: number): QuizItem[] {
  return shuffled(bank).slice(0, count);
}
