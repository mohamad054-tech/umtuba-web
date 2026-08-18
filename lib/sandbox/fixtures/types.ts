export const SANDBOX_LABEL = "SANDBOX" as const;
export const DEMO_LABEL = "DEMO" as const;
export const SYNTHETIC_DATA_LABEL = "SYNTHETIC DATA" as const;
export const NOT_LIVE_LABEL = "NOT LIVE" as const;
export const NO_REAL_PAYMENT_LABEL = "NO REAL PAYMENT" as const;
export const PROSPECTIVE_PARTNER_LABEL = "PROSPECTIVE PARTNER" as const;
export const NOT_AN_UMTUBA_PARTNER = "NOT AN UMTUBA PARTNER" as const;

export const LIFECYCLE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "ACTIVE",
  "SUSPENDED",
  "TERMINATED",
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const RIGHTS_FLAGS = [
  "CATALOG_DISPLAY_ALLOWED",
  "IMAGE_USAGE_ALLOWED",
  "CONTENT_HOSTING_ALLOWED",
  "CHECKOUT_ALLOWED",
  "RESELL_ALLOWED",
  "AI_USAGE_ALLOWED",
  "CERTIFICATE_RIGHTS",
] as const;
export type RightsFlag = (typeof RIGHTS_FLAGS)[number];
export type RightsValue = "ALLOW" | "DENY" | "UNKNOWN";

export type RightsMatrix = Record<RightsFlag, RightsValue>;

export function denyUnknown(value: RightsValue): boolean {
  return value === "ALLOW";
}

export function emptyRights(overrides: Partial<RightsMatrix> = {}): RightsMatrix {
  return {
    CATALOG_DISPLAY_ALLOWED: "UNKNOWN",
    IMAGE_USAGE_ALLOWED: "UNKNOWN",
    CONTENT_HOSTING_ALLOWED: "UNKNOWN",
    CHECKOUT_ALLOWED: "UNKNOWN",
    RESELL_ALLOWED: "UNKNOWN",
    AI_USAGE_ALLOWED: "UNKNOWN",
    CERTIFICATE_RIGHTS: "UNKNOWN",
    ...overrides,
  };
}

export function effectiveRights(matrix: RightsMatrix): Record<RightsFlag, boolean> {
  return {
    CATALOG_DISPLAY_ALLOWED: denyUnknown(matrix.CATALOG_DISPLAY_ALLOWED),
    IMAGE_USAGE_ALLOWED: denyUnknown(matrix.IMAGE_USAGE_ALLOWED),
    CONTENT_HOSTING_ALLOWED: denyUnknown(matrix.CONTENT_HOSTING_ALLOWED),
    CHECKOUT_ALLOWED: denyUnknown(matrix.CHECKOUT_ALLOWED),
    RESELL_ALLOWED: denyUnknown(matrix.RESELL_ALLOWED),
    AI_USAGE_ALLOWED: denyUnknown(matrix.AI_USAGE_ALLOWED),
    CERTIFICATE_RIGHTS: denyUnknown(matrix.CERTIFICATE_RIGHTS),
  };
}

export type CourseKind = "UMTUBA_ORIGINAL" | "PARTNER_COURSE" | "EXTERNAL_COURSE";

export type QuizChoice = { id: string; text: string };
export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: QuizChoice[];
  correctChoiceId: string;
  explanation: string;
};

export type SandboxExercise = {
  id: string;
  title: string;
  prompt: string;
  successCriteria: string[];
  scope: "lesson" | "course";
  lessonId?: string;
};

export type SandboxFinalAssessment = {
  id: "pe-final" | "ds-final" | "ai-final" | string;
  title: string;
  questions: QuizQuestion[];
  reviewBank: QuizQuestion[];
  passCorrect: number;
  passTotal: number;
  attempts: "UNLIMITED";
  mode: "SCORE";
};

export type SandboxCertificatePolicy = {
  issuer: "UMTUBA";
  represents: "UMTUBA_ONLY";
  requiresFinalAssessmentPass: true;
  passingScoreLabel: "4/5";
  notAnAccreditedCredential: true;
  statement: string;
};

export type SandboxLesson = {
  id: string;
  title: string;
  kind: "text" | "quiz" | "exercise" | "resource";
  estimatedMinutes: number;
  body: string;
  quiz: QuizQuestion[];
  objectives?: string[];
  resource?: { title: string; kind: string; body: string } | null;
  lessonExercise?: SandboxExercise;
};

export type SandboxModule = {
  id: string;
  title: string;
  summary: string;
  lessons: SandboxLesson[];
};

export type SandboxCourse = {
  id: string;
  slug: string;
  title: string;
  kind: CourseKind;
  status: LifecycleStatus;
  publishState: "DRAFT" | "SANDBOX_ONLY" | "NOT_PUBLIC";
  shortDescription: string;
  fullDescription?: string;
  targetAudience?: string;
  level?: string;
  prerequisites?: string[];
  learningObjectives?: string[];
  estimatedDurationMinutes?: number;
  progressRules?: readonly string[];
  language?: string;
  contentRights?: "OWNED" | "PARTNER" | "EXTERNAL";
  instructorId: string;
  providerId: string;
  contentOwner: string;
  certificateOwner: string;
  certificatePolicy?: SandboxCertificatePolicy;
  finalAssessment?: SandboxFinalAssessment;
  aiTutorAllowed: boolean;
  enrollmentMode: "HOSTED" | "EXTERNAL_CONTINUE" | "SANDBOX_ENROLL";
  listPriceMinor: number | null;
  revenueSharePercent: number | null;
  modules: SandboxModule[];
  exercises: SandboxExercise[];
  publicCatalog: false;
  synthetic: true;
};

export type SandboxPerson = {
  id: string;
  displayName: string;
  role: "student" | "instructor";
  specialty?: string;
  onboarding?: "DRAFT" | "ACTIVE";
  synthetic: true;
};

export type IntegrationMode =
  | "AFFILIATE"
  | "CATALOG_FEED"
  | "EXTERNAL_ENROLLMENT"
  | "RESELLER"
  | "CONTENT_LICENSE"
  | "CERTIFICATE_OWNER"
  | "AI_USAGE";

export type IntegrationValue = "DEMO" | "UNKNOWN" | "PENDING CONTRACT";

export type ProspectivePartner = {
  id: string;
  displayName: string;
  domain: "learning" | "commerce";
  status: "PROSPECTIVE";
  partnerClaim: typeof NOT_AN_UMTUBA_PARTNER;
  label: typeof PROSPECTIVE_PARTNER_LABEL;
  integrations: Record<IntegrationMode, IntegrationValue>;
  rights: RightsMatrix;
  notes: string;
  logo: null;
  catalogImported: false;
  synthetic: true;
};

export type StoreCommerceMode =
  | "UMTUBA_OWNED"
  | "AFFILIATE"
  | "CATALOG_API"
  | "DROPSHIP"
  | "WHOLESALE"
  | "RESELLER"
  | "MARKETPLACE_SELLER";

export type SandboxStoreActor = {
  id: string;
  displayName: string;
  kind: "platform" | "supplier" | "marketplace_seller";
  synthetic: true;
};

export type PaymentMode = "SANDBOX";
export type PaymentOutcome =
  | "SUCCESS"
  | "DECLINED"
  | "PROCESSING"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED_DEMO"
  | "FAILURE"
  | "REFUND"
  | "PENDING";

export type SandboxOrderStatus =
  | "CREATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "REFUNDED"
  | "PROCESSING"
  | "CANCELLED"
  | "RETURN_PENDING"
  | "REFUND_PENDING";

export type SandboxOrder = {
  id: string;
  productSlug: string;
  productTitle: string;
  quantity: number;
  amountMinor: number;
  currency: "USD";
  status: SandboxOrderStatus;
  paymentOutcome: PaymentOutcome;
  paymentMode: PaymentMode;
  realPayment: false;
  realProviderCall: false;
  shippingLabel: string;
  customerName: string;
};

export const MOCK_PAYMENT_ADAPTER = {
  id: "sandbox-mock-adapter",
  paymentMode: "SANDBOX" as const,
  realPayment: false,
  realProviderCall: false,
  realChargePossible: false,
  storesCardNumbers: false,
  testValue: "sandbox-method-only",
  note: "No card field is collected. Outcomes are simulated buttons only. REAL_PROVIDER_CALL=NO.",
};
