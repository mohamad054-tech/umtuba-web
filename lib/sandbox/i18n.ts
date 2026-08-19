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
  | "previousLesson"
  | "notes"
  | "saveNote"
  | "noteSaved"
  | "bookmark"
  | "bookmarked"
  | "objectives"
  | "audience"
  | "prerequisites"
  | "duration"
  | "completionRequirements"
  | "assessmentInfo"
  | "moduleQuiz"
  | "lessonExercise"
  | "courseExercise"
  | "quizScore"
  | "retryAllowed"
  | "passThreshold"
  | "certificateIssuer"
  | "certificateDemo"
  | "markLessonComplete"
  | "lessonComplete"
  | "quiz"
  | "submitQuiz"
  | "quizPassed"
  | "quizFailed"
  | "exercise"
  | "submitExercise"
  | "exerciseSaved"
  | "exerciseUnavailable"
  | "unknownExercise"
  | "returnToLesson"
  | "returnToCourse"
  | "successCriteria"
  | "exerciseProgress"
  | "enrollToSaveExercise"
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
  previousLesson: "Previous lesson",
  notes: "Lesson notes",
  saveNote: "Save note",
  noteSaved: "Note saved in sandbox state.",
  bookmark: "Bookmark",
  bookmarked: "Bookmarked",
  objectives: "Learning objectives",
  audience: "Target audience",
  prerequisites: "Prerequisites",
  duration: "Estimated duration",
  completionRequirements: "Completion requirements",
  assessmentInfo: "Final assessment: 4/5 · unlimited attempts · score mode",
  moduleQuiz: "Module quiz",
  lessonExercise: "Lesson exercise",
  courseExercise: "Course exercise",
  quizScore: "Score",
  retryAllowed: "Retry allowed. This does not complete the course.",
  passThreshold: "Pass threshold 4/5",
  certificateIssuer: "Issuer: UMTUBA",
  certificateDemo: "SANDBOX / DEMO · not a degree, license, or accreditation",
  markLessonComplete: "Mark lesson complete",
  lessonComplete: "Lesson complete",
  quiz: "Quiz",
  submitQuiz: "Submit quiz",
  quizPassed: "Correct.",
  quizFailed: "Not yet. Try again.",
  exercise: "Exercise",
  submitExercise: "Save exercise",
  exerciseSaved: "Exercise saved in sandbox state.",
  exerciseUnavailable: "This Learning exercise is unavailable",
  unknownExercise:
    "This Learning sandbox exercise is missing or invalid. It is not a generic page crash.",
  returnToLesson: "Return to lesson",
  returnToCourse: "Return to course",
  successCriteria: "Success criteria",
  exerciseProgress: "Sandbox progress",
  enrollToSaveExercise: "Sandbox enroll to save this exercise",
  finalAssessment: "Final assessment",
  submitAssessment: "Submit assessment",
  assessmentPassed: "Passed this sandbox check.",
  assessmentFailed: "Below 4/5. Retry allowed. Not accreditation.",
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
  previousLesson: "الدرس السابق",
  notes: "ملاحظات الدرس",
  saveNote: "حفظ الملاحظة",
  noteSaved: "حُفظت الملاحظة في حالة الصندوق.",
  bookmark: "إشارة مرجعية",
  bookmarked: "مُعلَّم",
  objectives: "أهداف التعلّم",
  audience: "الجمهور المستهدف",
  prerequisites: "المتطلبات",
  duration: "المدة التقديرية",
  completionRequirements: "متطلبات الإكمال",
  assessmentInfo: "التقييم النهائي: ٤/٥ · محاولات غير محدودة · وضع الدرجة",
  moduleQuiz: "اختبار الوحدة",
  lessonExercise: "تمرين الدرس",
  courseExercise: "تمرين الدورة",
  quizScore: "الدرجة",
  retryAllowed: "إعادة المحاولة مسموحة. هذا لا يُكمل الدورة.",
  passThreshold: "عتبة النجاح ٤/٥",
  certificateIssuer: "المُصدِر: UMTUBA",
  certificateDemo: "صندوق / تجريبي · ليست درجة ولا رخصة ولا اعتماداً",
  markLessonComplete: "تعليم الدرس مكتملاً",
  lessonComplete: "الدرس مكتمل",
  quiz: "اختبار قصير",
  submitQuiz: "إرسال الاختبار",
  quizPassed: "صحيح.",
  quizFailed: "ليس بعد. أعد المحاولة.",
  exercise: "تمرين",
  submitExercise: "حفظ التمرين",
  exerciseSaved: "حُفظ التمرين في حالة الصندوق.",
  exerciseUnavailable: "تمرين التعلّم هذا غير متاح",
  unknownExercise: "تمرين صندوق التعلّم هذا مفقود أو غير صالح. هذه ليست أعطالاً عامة للصفحة.",
  returnToLesson: "العودة إلى الدرس",
  returnToCourse: "العودة إلى الدورة",
  successCriteria: "معايير النجاح",
  exerciseProgress: "تقدّم الصندوق",
  enrollToSaveExercise: "سجّل في الصندوق لحفظ هذا التمرين",
  finalAssessment: "التقييم النهائي",
  submitAssessment: "إرسال التقييم",
  assessmentPassed: "نجحت في فحص الصندوق.",
  assessmentFailed: "أقل من ٤/٥. إعادة المحاولة مسموحة. ليست اعتماداً.",
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
  banner:
    "DÉMO · SANDBOX · DONNÉES SYNTHÉTIQUES · PAS EN LIGNE · AUCUN PAIEMENT RÉEL. Les noms prospectifs ne sont pas des partenaires UMTUBA.",
  deniedTitle: "Ce bac à sable est privé",
  deniedBody:
    "Connectez-vous en tant qu’administrateur de plateforme, ou ouvrez le chemin opérateur avec le jeton serveur configuré. Les visiteurs anonymes sont refusés. STORE_DEMO_PREVIEW=1 ne suffit pas.",
  signIn: "Connexion",
  hub: "Aperçu",
  learning: "Apprentissage",
  learningStudent: "Étudiant",
  learningInstructor: "Instructeur",
  learningAdmin: "Admin apprentissage",
  learningPartners: "Partenaires apprentissage",
  store: "Boutique",
  storeCart: "Panier",
  storeCheckout: "Paiement",
  storeOrders: "Commandes",
  storeSeller: "Vendeur",
  storePartners: "Partenaires commerce",
  commercial: "Modèle commercial",
  rights: "Droits",
  synthetic: "DONNÉES SYNTHÉTIQUES",
  notLive: "PAS EN LIGNE",
  noPayment: "AUCUN PAIEMENT RÉEL",
  prospective: "PARTENAIRE PROSPECTIF",
  notPartner: "PAS UN PARTENAIRE UMTUBA",
  continueProvider: "Continuer avec le prestataire (sandbox)",
  simulateSuccess: "Simuler le succès",
  simulateFailure: "Simuler l’échec",
  simulateRefund: "Simuler le remboursement",
  checkoutBlocked: "Le paiement production est désactivé. PAYMENT_MODE=SANDBOX.",
  originalsDraft: "Les Originals UMTUBA restent BROUILLON et hors catalogue public.",
  openCourse: "Ouvrir le cours",
  openProduct: "Ouvrir le produit",
  backHub: "Retour à l’aperçu",
  catalog: "Catalogue",
  searchFilter: "Recherche et filtres",
  learningHome: "Sandbox apprentissage",
  learningHomeLead:
    "Aperçu exécutable privé. Étudiants et instructeurs synthétiques seulement. Le /learning de production est inchangé.",
  studentRoster: "Étudiants synthétiques",
  studentRosterLead: "20–30 étudiants démo. Ouvrez un profil, puis le tableau, puis un cours.",
  studentProfile: "Profil étudiant",
  studentDashboard: "Tableau étudiant",
  studentE2e: "Parcours étudiant cliquable",
  openStudent: "Ouvrir l’étudiant",
  openInstructor: "Ouvrir l’instructeur",
  instructorRoster: "Instructeurs synthétiques",
  instructorProfile: "Profil instructeur",
  instructorDashboard: "Tableau instructeur",
  courseCreation: "Création de cours",
  instructorAnalytics: "Analytique instructeur",
  instructorFinancial: "Aperçu financier instructeur",
  enrollmentModels: "Modèles d’inscription",
  enrollSandbox: "Inscription sandbox",
  freeEnrollment: "Gratuit",
  paidLearning: "Payant sandbox",
  paidFirst: "Aperçu payant. Un succès de paiement fictif est requis avant les leçons.",
  mockPayment: "Paiement fictif",
  simulatePending: "Simuler en attente",
  noCardFields: "Aucun numéro de carte n’est demandé ni stocké. REAL_CHARGE_POSSIBLE=NO.",
  openLesson: "Ouvrir la leçon",
  nextLesson: "Leçon suivante",
  previousLesson: "Leçon précédente",
  notes: "Notes de leçon",
  saveNote: "Enregistrer la note",
  noteSaved: "Note enregistrée dans l’état sandbox.",
  bookmark: "Signet",
  bookmarked: "Ajouté aux signets",
  objectives: "Objectifs d’apprentissage",
  audience: "Public cible",
  prerequisites: "Prérequis",
  duration: "Durée estimée",
  completionRequirements: "Conditions d’achèvement",
  assessmentInfo: "Évaluation finale : 4/5 · tentatives illimitées · mode score",
  moduleQuiz: "Quiz du module",
  lessonExercise: "Exercice de leçon",
  courseExercise: "Exercice de cours",
  quizScore: "Score",
  retryAllowed: "Nouvel essai autorisé. Cela ne termine pas le cours.",
  passThreshold: "Seuil de réussite 4/5",
  certificateIssuer: "Émetteur : UMTUBA",
  certificateDemo: "SANDBOX / DÉMO · ni diplôme, ni licence, ni accréditation",
  markLessonComplete: "Marquer la leçon comme terminée",
  lessonComplete: "Leçon terminée",
  quiz: "Quiz",
  submitQuiz: "Envoyer le quiz",
  quizPassed: "Correct.",
  quizFailed: "Pas encore. Réessayez.",
  exercise: "Exercice",
  submitExercise: "Enregistrer l’exercice",
  exerciseSaved: "Exercice enregistré dans l’état sandbox.",
  exerciseUnavailable: "Cet exercice Learning est indisponible",
  unknownExercise:
    "Cet exercice sandbox Learning est manquant ou invalide. Ce n’est pas un plantage générique.",
  returnToLesson: "Retour à la leçon",
  returnToCourse: "Retour au cours",
  successCriteria: "Critères de réussite",
  exerciseProgress: "Progression sandbox",
  enrollToSaveExercise: "Inscrivez-vous au sandbox pour enregistrer cet exercice",
  finalAssessment: "Évaluation finale",
  submitAssessment: "Envoyer l’évaluation",
  assessmentPassed: "Réussi ce contrôle sandbox.",
  assessmentFailed: "Sous 4/5. Nouvel essai autorisé. Pas une accréditation.",
  noAccreditation: "Pas une accréditation. Pas une licence professionnelle.",
  aiTutor: "Tuteur IA (sandbox)",
  askTutor: "Demander au tuteur local",
  tutorDenied: "Le tuteur IA est refusé pour ce cours.",
  certificate: "Certificat",
  certificateRules:
    "Les Originals UMTUBA peuvent prévisualiser un certificat sandbox détenu par UMTUBA. Les aperçus partenaires utilisent le prestataire démo. Les cours externes n’émettent rien. Les certificats Coursera, Udemy et edX ne sont jamais émis.",
  progress: "Progression",
  whatNext: "Et ensuite",
  bodyMissing: "Le corps de leçon n’est pas rédigé. Le sandbox ne l’inventera pas.",
  authoredSourceLanguage: "Le texte de leçon rédigé reste dans sa langue d’origine.",
  unknownCourse: "Cours sandbox inconnu.",
  unknownLesson: "Leçon sandbox inconnue.",
  unknownStudent: "Étudiant sandbox inconnu.",
  unknownInstructor: "Instructeur sandbox inconnu.",
  syntheticPerson: "Personne synthétique. Pas un apprenant réel.",
  createDraft: "Créer un brouillon",
  advanceDraft: "Avancer le cycle de vie",
  creationLead: "BROUILLON → REVUE → SANDBOX UNIQUEMENT. N’entre jamais dans le catalogue public /learning.",
  adminLead: "Libellés admin exécutables seulement. Les partenaires prospectifs ne deviennent pas ACTIFS.",
  prospectivePartners: "Partenaires prospectifs",
  prospectiveStay: "Le statut reste PROSPECTIF. Pas un contrat.",
  tryActivate: "Tenter d’activer (doit échouer)",
  qualityJudgments: "Jugements produit honnêtes",
};

const es: Catalog = {
  ...en,
  title: "Sandbox de vista de negocio",
  subtitle: "Vista privada del Product Owner · solo datos sintéticos",
  badge: "SANDBOX",
  banner:
    "DEMO · SANDBOX · DATOS SINTÉTICOS · NO EN VIVO · SIN PAGO REAL. Los nombres prospectivos no son socios de UMTUBA.",
  deniedTitle: "Este sandbox es privado",
  deniedBody:
    "Inicia sesión como administrador de plataforma, o abre la ruta de operador con el token de servidor configurado. Los visitantes anónimos se deniegan. STORE_DEMO_PREVIEW=1 no basta.",
  signIn: "Iniciar sesión",
  hub: "Resumen",
  learning: "Aprendizaje",
  learningStudent: "Estudiante",
  learningInstructor: "Instructor",
  learningAdmin: "Admin de aprendizaje",
  learningPartners: "Socios de aprendizaje",
  store: "Tienda",
  storeCart: "Carrito",
  storeCheckout: "Pago",
  storeOrders: "Pedidos",
  storeSeller: "Vendedor",
  storePartners: "Socios de comercio",
  commercial: "Modelo comercial",
  rights: "Derechos",
  synthetic: "DATOS SINTÉTICOS",
  notLive: "NO EN VIVO",
  noPayment: "SIN PAGO REAL",
  prospective: "SOCIO PROSPECTIVO",
  notPartner: "NO ES UN SOCIO DE UMTUBA",
  continueProvider: "Continuar con el proveedor (sandbox)",
  simulateSuccess: "Simular éxito",
  simulateFailure: "Simular fallo",
  simulateRefund: "Simular reembolso",
  checkoutBlocked: "El pago de producción está desactivado. PAYMENT_MODE=SANDBOX.",
  originalsDraft: "Los Originals de UMTUBA siguen en BORRADOR y no están en el catálogo público.",
  openCourse: "Abrir curso",
  openProduct: "Abrir producto",
  backHub: "Volver al resumen",
  catalog: "Catálogo",
  searchFilter: "Buscar y filtrar",
  learningHome: "Sandbox de aprendizaje",
  learningHomeLead:
    "Vista previa ejecutable privada. Solo estudiantes e instructores sintéticos. El /learning de producción no cambia.",
  studentRoster: "Estudiantes sintéticos",
  studentRosterLead: "20–30 estudiantes demo. Abre un perfil, luego el panel, luego un curso.",
  studentProfile: "Perfil del estudiante",
  studentDashboard: "Panel del estudiante",
  studentE2e: "Ruta de estudiante clicable",
  openStudent: "Abrir estudiante",
  openInstructor: "Abrir instructor",
  instructorRoster: "Instructores sintéticos",
  instructorProfile: "Perfil del instructor",
  instructorDashboard: "Panel del instructor",
  courseCreation: "Creación de curso",
  instructorAnalytics: "Analítica del instructor",
  instructorFinancial: "Vista financiera del instructor",
  enrollmentModels: "Modelos de inscripción",
  enrollSandbox: "Inscripción sandbox",
  freeEnrollment: "Gratis",
  paidLearning: "De pago sandbox",
  paidFirst: "Vista previa de pago. Se requiere un SUCCESS de pago simulado antes de las lecciones.",
  mockPayment: "Pago simulado",
  simulatePending: "Simular pendiente",
  noCardFields: "No se pide ni se guarda un número de tarjeta. REAL_CHARGE_POSSIBLE=NO.",
  openLesson: "Abrir lección",
  nextLesson: "Lección siguiente",
  previousLesson: "Lección anterior",
  notes: "Notas de la lección",
  saveNote: "Guardar nota",
  noteSaved: "Nota guardada en el estado del sandbox.",
  bookmark: "Marcador",
  bookmarked: "Marcado",
  objectives: "Objetivos de aprendizaje",
  audience: "Público objetivo",
  prerequisites: "Requisitos previos",
  duration: "Duración estimada",
  completionRequirements: "Requisitos de finalización",
  assessmentInfo: "Evaluación final: 4/5 · intentos ilimitados · modo puntuación",
  moduleQuiz: "Cuestionario del módulo",
  lessonExercise: "Ejercicio de lección",
  courseExercise: "Ejercicio de curso",
  quizScore: "Puntuación",
  retryAllowed: "Reintento permitido. Esto no completa el curso.",
  passThreshold: "Umbral de aprobado 4/5",
  certificateIssuer: "Emisor: UMTUBA",
  certificateDemo: "SANDBOX / DEMO · no es un título, licencia ni acreditación",
  markLessonComplete: "Marcar lección como completada",
  lessonComplete: "Lección completada",
  quiz: "Cuestionario",
  submitQuiz: "Enviar cuestionario",
  quizPassed: "Correcto.",
  quizFailed: "Aún no. Inténtalo de nuevo.",
  exercise: "Ejercicio",
  submitExercise: "Guardar ejercicio",
  exerciseSaved: "Ejercicio guardado en el estado del sandbox.",
  exerciseUnavailable: "Este ejercicio de Learning no está disponible",
  unknownExercise:
    "Este ejercicio del sandbox de Learning falta o no es válido. No es un fallo genérico de página.",
  returnToLesson: "Volver a la lección",
  returnToCourse: "Volver al curso",
  successCriteria: "Criterios de éxito",
  exerciseProgress: "Progreso del sandbox",
  enrollToSaveExercise: "Inscríbete en el sandbox para guardar este ejercicio",
  finalAssessment: "Evaluación final",
  submitAssessment: "Enviar evaluación",
  assessmentPassed: "Aprobaste esta comprobación del sandbox.",
  assessmentFailed: "Por debajo de 4/5. Reintento permitido. No es acreditación.",
  noAccreditation: "No es acreditación. No es una licencia profesional.",
  aiTutor: "Tutor de IA (sandbox)",
  askTutor: "Preguntar al tutor local",
  tutorDenied: "El tutor de IA está denegado para este curso.",
  certificate: "Certificado",
  certificateRules:
    "Los Originals de UMTUBA pueden previsualizar un certificado sandbox de UMTUBA. Las vistas de socio usan el proveedor demo. Los cursos externos no emiten nada. Nunca se emiten certificados de Coursera, Udemy o edX.",
  progress: "Progreso",
  whatNext: "Qué sigue",
  bodyMissing: "El cuerpo de la lección no está redactado. El sandbox no lo inventará.",
  authoredSourceLanguage: "El texto redactado de la lección permanece en su idioma original.",
  unknownCourse: "Curso sandbox desconocido.",
  unknownLesson: "Lección sandbox desconocida.",
  unknownStudent: "Estudiante sandbox desconocido.",
  unknownInstructor: "Instructor sandbox desconocido.",
  syntheticPerson: "Persona sintética. No es un alumno real.",
  createDraft: "Crear borrador",
  advanceDraft: "Avanzar el ciclo de vida",
  creationLead: "BORRADOR → REVISIÓN → SOLO SANDBOX. Nunca entra en el catálogo público /learning.",
  adminLead: "Solo etiquetas admin ejecutables. Los socios prospectivos no pasan a ACTIVO.",
  prospectivePartners: "Socios prospectivos",
  prospectiveStay: "El estado sigue PROSPECTIVO. No es un contrato.",
  tryActivate: "Intentar activar (debe fallar)",
  qualityJudgments: "Juicios de producto honestos",
};

const de: Catalog = {
  ...en,
  title: "Business-Vorschau-Sandbox",
  subtitle: "Private Product-Owner-Vorschau · nur synthetische Daten",
  badge: "SANDBOX",
  banner:
    "DEMO · SANDBOX · SYNTHETISCHE DATEN · NICHT LIVE · KEINE ECHTE ZAHLUNG. Prospektive Namen sind keine UMTUBA-Partner.",
  deniedTitle: "Diese Sandbox ist privat",
  deniedBody:
    "Melde dich als Plattformadministrator an oder öffne den Operator-Pfad mit dem konfigurierten Server-Token. Anonyme Besucher werden abgelehnt. STORE_DEMO_PREVIEW=1 reicht nicht.",
  signIn: "Anmelden",
  hub: "Übersicht",
  learning: "Lernen",
  learningStudent: "Teilnehmer",
  learningInstructor: "Dozent",
  learningAdmin: "Learning-Admin",
  learningPartners: "Learning-Partner",
  store: "Shop",
  storeCart: "Warenkorb",
  storeCheckout: "Kasse",
  storeOrders: "Bestellungen",
  storeSeller: "Verkäufer",
  storePartners: "Handelspartner",
  commercial: "Geschäftsmodell",
  rights: "Rechte",
  synthetic: "SYNTHETISCHE DATEN",
  notLive: "NICHT LIVE",
  noPayment: "KEINE ECHTE ZAHLUNG",
  prospective: "PROSPEKTIVER PARTNER",
  notPartner: "KEIN UMTUBA-PARTNER",
  continueProvider: "Mit Anbieter fortfahren (Sandbox)",
  simulateSuccess: "Erfolg simulieren",
  simulateFailure: "Fehler simulieren",
  simulateRefund: "Erstattung simulieren",
  checkoutBlocked: "Produktionskasse ist aus. PAYMENT_MODE=SANDBOX.",
  originalsDraft: "UMTUBA Originals bleiben ENTWURF und sind nicht im öffentlichen Katalog.",
  openCourse: "Kurs öffnen",
  openProduct: "Produkt öffnen",
  backHub: "Zurück zur Übersicht",
  catalog: "Katalog",
  searchFilter: "Suchen und filtern",
  learningHome: "Learning-Sandbox",
  learningHomeLead:
    "Private ausführbare Vorschau. Nur synthetische Teilnehmer und Dozenten. Produktions-/learning bleibt unverändert.",
  studentRoster: "Synthetische Teilnehmer",
  studentRosterLead: "20–30 Demo-Teilnehmer. Öffne ein Profil, dann das Dashboard, dann einen Kurs.",
  studentProfile: "Teilnehmerprofil",
  studentDashboard: "Teilnehmer-Dashboard",
  studentE2e: "Klickbarer Teilnehmerpfad",
  openStudent: "Teilnehmer öffnen",
  openInstructor: "Dozent öffnen",
  instructorRoster: "Synthetische Dozenten",
  instructorProfile: "Dozentenprofil",
  instructorDashboard: "Dozenten-Dashboard",
  courseCreation: "Kurserstellung",
  instructorAnalytics: "Dozenten-Analytik",
  instructorFinancial: "Finanzvorschau Dozent",
  enrollmentModels: "Einschreibemodelle",
  enrollSandbox: "Sandbox-Einschreibung",
  freeEnrollment: "Kostenlos",
  paidLearning: "Kostenpflichtig Sandbox",
  paidFirst: "Bezahlte Vorschau. Ein Mock-Zahlungs-SUCCESS ist vor den Lektionen nötig.",
  mockPayment: "Mock-Zahlung",
  simulatePending: "Ausstehend simulieren",
  noCardFields: "Es wird keine Kartennummer angefragt oder gespeichert. REAL_CHARGE_POSSIBLE=NO.",
  openLesson: "Lektion öffnen",
  nextLesson: "Nächste Lektion",
  previousLesson: "Vorherige Lektion",
  notes: "Lektionsnotizen",
  saveNote: "Notiz speichern",
  noteSaved: "Notiz im Sandbox-Zustand gespeichert.",
  bookmark: "Lesezeichen",
  bookmarked: "Mit Lesezeichen",
  objectives: "Lernziele",
  audience: "Zielgruppe",
  prerequisites: "Voraussetzungen",
  duration: "Geschätzte Dauer",
  completionRequirements: "Abschlussanforderungen",
  assessmentInfo: "Abschlussprüfung: 4/5 · unbegrenzte Versuche · Punktmodus",
  moduleQuiz: "Modulquiz",
  lessonExercise: "Lektionsübung",
  courseExercise: "Kursübung",
  quizScore: "Punktzahl",
  retryAllowed: "Erneuter Versuch erlaubt. Das schließt den Kurs nicht ab.",
  passThreshold: "Bestehensgrenze 4/5",
  certificateIssuer: "Aussteller: UMTUBA",
  certificateDemo: "SANDBOX / DEMO · kein Abschluss, keine Lizenz, keine Akkreditierung",
  markLessonComplete: "Lektion als abgeschlossen markieren",
  lessonComplete: "Lektion abgeschlossen",
  quiz: "Quiz",
  submitQuiz: "Quiz senden",
  quizPassed: "Richtig.",
  quizFailed: "Noch nicht. Versuche es erneut.",
  exercise: "Übung",
  submitExercise: "Übung speichern",
  exerciseSaved: "Übung im Sandbox-Zustand gespeichert.",
  exerciseUnavailable: "Diese Learning-Übung ist nicht verfügbar",
  unknownExercise:
    "Diese Learning-Sandbox-Übung fehlt oder ist ungültig. Das ist kein allgemeiner Seitenabsturz.",
  returnToLesson: "Zurück zur Lektion",
  returnToCourse: "Zurück zum Kurs",
  successCriteria: "Erfolgskriterien",
  exerciseProgress: "Sandbox-Fortschritt",
  enrollToSaveExercise: "Zur Sandbox einschreiben, um diese Übung zu speichern",
  finalAssessment: "Abschlussprüfung",
  submitAssessment: "Prüfung senden",
  assessmentPassed: "Diese Sandbox-Prüfung bestanden.",
  assessmentFailed: "Unter 4/5. Erneuter Versuch erlaubt. Keine Akkreditierung.",
  noAccreditation: "Keine Akkreditierung. Keine Berufslizenz.",
  aiTutor: "KI-Tutor (Sandbox)",
  askTutor: "Lokalen Tutor fragen",
  tutorDenied: "Der KI-Tutor ist für diesen Kurs verweigert.",
  certificate: "Zertifikat",
  certificateRules:
    "UMTUBA Originals können ein UMTUBA-eigenes Sandbox-Zertifikat vorschauen. Partner-Vorschauen nutzen den Demo-Anbieter. Externe Kurse stellen nichts aus. Coursera-, Udemy- und edX-Zertifikate werden nie ausgestellt.",
  progress: "Fortschritt",
  whatNext: "Was als Nächstes",
  bodyMissing: "Der Lektionstext ist nicht verfasst. Die Sandbox erfindet ihn nicht.",
  authoredSourceLanguage: "Verfasster Lektionstext bleibt in der Ausgangssprache.",
  unknownCourse: "Unbekannter Sandbox-Kurs.",
  unknownLesson: "Unbekannte Sandbox-Lektion.",
  unknownStudent: "Unbekannter Sandbox-Teilnehmer.",
  unknownInstructor: "Unbekannter Sandbox-Dozent.",
  syntheticPerson: "Synthetische Person. Kein echter Lerner.",
  createDraft: "Entwurf erstellen",
  advanceDraft: "Lebenszyklus fortschieben",
  creationLead: "ENTWURF → PRÜFUNG → NUR SANDBOX. Gelangt nie in den öffentlichen /learning-Katalog.",
  adminLead: "Nur ausführbare Admin-Labels. Prospektive Partner werden nicht AKTIV.",
  prospectivePartners: "Prospektive Partner",
  prospectiveStay: "Status bleibt PROSPEKTIV. Kein Vertrag.",
  tryActivate: "Aktivierung versuchen (muss scheitern)",
  qualityJudgments: "Ehrliche Produkturteile",
};

const pt: Catalog = {
  ...en,
  title: "Sandbox de pré-visualização de negócio",
  subtitle: "Pré-visualização privada do Product Owner · só dados sintéticos",
  badge: "SANDBOX",
  banner:
    "DEMO · SANDBOX · DADOS SINTÉTICOS · NÃO EM DIRETO · SEM PAGAMENTO REAL. Nomes prospetivos não são parceiros UMTUBA.",
  deniedTitle: "Este sandbox é privado",
  deniedBody:
    "Entre como administrador da plataforma, ou abra o caminho do operador com o token de servidor configurado. Visitantes anónimos são recusados. STORE_DEMO_PREVIEW=1 não chega.",
  signIn: "Entrar",
  hub: "Visão geral",
  learning: "Aprendizagem",
  learningStudent: "Estudante",
  learningInstructor: "Formador",
  learningAdmin: "Admin de aprendizagem",
  learningPartners: "Parceiros de aprendizagem",
  store: "Loja",
  storeCart: "Carrinho",
  storeCheckout: "Checkout",
  storeOrders: "Encomendas",
  storeSeller: "Vendedor",
  storePartners: "Parceiros de comércio",
  commercial: "Modelo comercial",
  rights: "Direitos",
  synthetic: "DADOS SINTÉTICOS",
  notLive: "NÃO EM DIRETO",
  noPayment: "SEM PAGAMENTO REAL",
  prospective: "PARCEIRO PROSPETIVO",
  notPartner: "NÃO É UM PARCEIRO UMTUBA",
  continueProvider: "Continuar com o fornecedor (sandbox)",
  simulateSuccess: "Simular sucesso",
  simulateFailure: "Simular falha",
  simulateRefund: "Simular reembolso",
  checkoutBlocked: "O checkout de produção está desligado. PAYMENT_MODE=SANDBOX.",
  originalsDraft: "Os Originals UMTUBA permanecem RASCUNHO e fora do catálogo público.",
  openCourse: "Abrir curso",
  openProduct: "Abrir produto",
  backHub: "Voltar à visão geral",
  catalog: "Catálogo",
  searchFilter: "Pesquisar e filtrar",
  learningHome: "Sandbox de aprendizagem",
  learningHomeLead:
    "Pré-visualização executável privada. Só estudantes e formadores sintéticos. O /learning de produção não muda.",
  studentRoster: "Estudantes sintéticos",
  studentRosterLead: "20–30 estudantes demo. Abra um perfil, depois o painel, depois um curso.",
  studentProfile: "Perfil do estudante",
  studentDashboard: "Painel do estudante",
  studentE2e: "Percurso de estudante clicável",
  openStudent: "Abrir estudante",
  openInstructor: "Abrir formador",
  instructorRoster: "Formadores sintéticos",
  instructorProfile: "Perfil do formador",
  instructorDashboard: "Painel do formador",
  courseCreation: "Criação de curso",
  instructorAnalytics: "Análise do formador",
  instructorFinancial: "Pré-visualização financeira do formador",
  enrollmentModels: "Modelos de inscrição",
  enrollSandbox: "Inscrição sandbox",
  freeEnrollment: "Grátis",
  paidLearning: "Pago sandbox",
  paidFirst: "Pré-visualização paga. É necessário um SUCCESS de pagamento simulado antes das lições.",
  mockPayment: "Pagamento simulado",
  simulatePending: "Simular pendente",
  noCardFields: "Não é pedido nem guardado um número de cartão. REAL_CHARGE_POSSIBLE=NO.",
  openLesson: "Abrir lição",
  nextLesson: "Lição seguinte",
  previousLesson: "Lição anterior",
  notes: "Notas da lição",
  saveNote: "Guardar nota",
  noteSaved: "Nota guardada no estado do sandbox.",
  bookmark: "Marcador",
  bookmarked: "Marcado",
  objectives: "Objetivos de aprendizagem",
  audience: "Público-alvo",
  prerequisites: "Pré-requisitos",
  duration: "Duração estimada",
  completionRequirements: "Requisitos de conclusão",
  assessmentInfo: "Avaliação final: 4/5 · tentativas ilimitadas · modo de pontuação",
  moduleQuiz: "Questionário do módulo",
  lessonExercise: "Exercício da lição",
  courseExercise: "Exercício do curso",
  quizScore: "Pontuação",
  retryAllowed: "Nova tentativa permitida. Isto não conclui o curso.",
  passThreshold: "Limiar de aprovação 4/5",
  certificateIssuer: "Emissor: UMTUBA",
  certificateDemo: "SANDBOX / DEMO · não é grau, licença nem acreditação",
  markLessonComplete: "Marcar lição como concluída",
  lessonComplete: "Lição concluída",
  quiz: "Questionário",
  submitQuiz: "Enviar questionário",
  quizPassed: "Correto.",
  quizFailed: "Ainda não. Tente novamente.",
  exercise: "Exercício",
  submitExercise: "Guardar exercício",
  exerciseSaved: "Exercício guardado no estado do sandbox.",
  exerciseUnavailable: "Este exercício de Learning está indisponível",
  unknownExercise:
    "Este exercício do sandbox de Learning está em falta ou é inválido. Não é uma falha genérica da página.",
  returnToLesson: "Voltar à lição",
  returnToCourse: "Voltar ao curso",
  successCriteria: "Critérios de sucesso",
  exerciseProgress: "Progresso do sandbox",
  enrollToSaveExercise: "Inscreva-se no sandbox para guardar este exercício",
  finalAssessment: "Avaliação final",
  submitAssessment: "Enviar avaliação",
  assessmentPassed: "Passou nesta verificação do sandbox.",
  assessmentFailed: "Abaixo de 4/5. Nova tentativa permitida. Não é acreditação.",
  noAccreditation: "Não é acreditação. Não é uma licença profissional.",
  aiTutor: "Tutor de IA (sandbox)",
  askTutor: "Perguntar ao tutor local",
  tutorDenied: "O tutor de IA está recusado para este curso.",
  certificate: "Certificado",
  certificateRules:
    "Os Originals UMTUBA podem pré-visualizar um certificado sandbox da UMTUBA. Pré-visualizações de parceiros usam o fornecedor demo. Cursos externos não emitem nada. Certificados Coursera, Udemy e edX nunca são emitidos.",
  progress: "Progresso",
  whatNext: "O que se segue",
  bodyMissing: "O corpo da lição não está redigido. O sandbox não o inventará.",
  authoredSourceLanguage: "O texto redigido da lição permanece na língua de origem.",
  unknownCourse: "Curso sandbox desconhecido.",
  unknownLesson: "Lição sandbox desconhecida.",
  unknownStudent: "Estudante sandbox desconhecido.",
  unknownInstructor: "Formador sandbox desconhecido.",
  syntheticPerson: "Pessoa sintética. Não é um aluno real.",
  createDraft: "Criar rascunho",
  advanceDraft: "Avançar o ciclo de vida",
  creationLead: "RASCUNHO → REVISÃO → SÓ SANDBOX. Nunca entra no catálogo público /learning.",
  adminLead: "Apenas etiquetas admin executáveis. Parceiros prospetivos não ficam ATIVOS.",
  prospectivePartners: "Parceiros prospetivos",
  prospectiveStay: "O estado permanece PROSPETIVO. Não é um contrato.",
  tryActivate: "Tentar ativar (tem de falhar)",
  qualityJudgments: "Julgamentos de produto honestos",
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
