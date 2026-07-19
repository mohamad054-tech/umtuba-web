import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidSlug, slugify } from "./validators";
import {
  OPEN_SELLER_APPLICATION_STATUSES,
  getLatestSellerApplication,
  type SellerApplicationResult,
  type SellerApplicationRow,
} from "./sellerApplications";

type AnyClient = SupabaseClient;

export const STORE_TEMPLATES = [
  "boutique",
  "marketplace",
  "digital",
  "services",
  "general",
] as const;
export type StoreTemplate = (typeof STORE_TEMPLATES)[number];

export const STORE_SETUP_STEPS = [
  { id: 1, key: "identity", label: "Identity" },
  { id: 2, key: "information", label: "Information" },
  { id: 3, key: "template", label: "Template" },
  { id: 4, key: "contact", label: "Contact" },
  { id: 5, key: "policies", label: "Policies" },
  { id: 6, key: "review", label: "Review" },
] as const;

export type StoreSetupStepId = (typeof STORE_SETUP_STEPS)[number]["id"];

export const STORE_TEMPLATE_META: Record<
  StoreTemplate,
  { label: string; description: string }
> = {
  boutique: {
    label: "Boutique",
    description: "Curated, brand-led catalog with a focused product line.",
  },
  marketplace: {
    label: "Marketplace",
    description: "Broader assortment across multiple categories.",
  },
  digital: {
    label: "Digital",
    description: "Downloads, subscriptions, and online-only goods.",
  },
  services: {
    label: "Services",
    description: "Bookable or appointment-based offerings.",
  },
  general: {
    label: "General",
    description: "Flexible storefront without a specialized layout bias.",
  },
};

/** Atomic DB submit path — only draft→pending transition for the caller. */
export const SUBMIT_MY_SELLER_APPLICATION_RPC = "submit_my_seller_application";

export type StoreSetupDraftInput = {
  storeName?: unknown;
  slug?: unknown;
  tagline?: unknown;
  description?: unknown;
  countryCode?: unknown;
  city?: unknown;
  defaultCurrency?: unknown;
  storeTemplate?: unknown;
  publicContactEmail?: unknown;
  publicContactPhone?: unknown;
  publicContactUrl?: unknown;
  returnPolicy?: unknown;
  shippingPolicy?: unknown;
  privacyPolicy?: unknown;
  wizardStep?: unknown;
};

export type StoreSetupValues = {
  storeName: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  countryCode: string | null;
  city: string | null;
  defaultCurrency: string;
  storeTemplate: StoreTemplate | null;
  publicContactEmail: string | null;
  publicContactPhone: string | null;
  publicContactUrl: string | null;
  returnPolicy: string | null;
  shippingPolicy: string | null;
  privacyPolicy: string | null;
  wizardStep: StoreSetupStepId;
};

export type SetupChecklistItem = {
  key: string;
  label: string;
  complete: boolean;
  detail: string;
};

const PHONE_RE = /^[0-9+()\s.-]+$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function normalizeOptionalString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function clampWizardStep(value: unknown): StoreSetupStepId {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : 1;
  if (!Number.isFinite(n)) return 1;
  return Math.min(6, Math.max(1, Math.trunc(n))) as StoreSetupStepId;
}

export function isStoreTemplate(value: unknown): value is StoreTemplate {
  return (
    typeof value === "string" &&
    (STORE_TEMPLATES as readonly string[]).includes(value)
  );
}

/** Normalize phone to a conservative international-friendly form. */
export function normalizePublicContactPhone(
  value: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, message: "Contact phone is invalid." };
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > 40) {
    return { ok: false, message: "Contact phone must be at most 40 characters." };
  }
  if (!PHONE_RE.test(normalized)) {
    return {
      ok: false,
      message:
        "Contact phone may only include digits, spaces, +, -, parentheses, or dots.",
    };
  }
  const digitCount = (normalized.match(/\d/g) ?? []).length;
  if (digitCount < 7) {
    return { ok: false, message: "Contact phone must include at least 7 digits." };
  }
  return { ok: true, value: normalized };
}

/** Allow only http(s) public contact URLs; empty remains allowed. */
export function normalizePublicContactUrl(
  value: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, message: "Contact link is invalid." };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 300) {
    return { ok: false, message: "Contact link must be at most 300 characters." };
  }
  if (/\s/.test(trimmed)) {
    return { ok: false, message: "Contact link must not contain spaces." };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return {
      ok: false,
      message: "Contact link must be a valid http or https URL.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      message: "Contact link must be a valid http or https URL.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      message: "Contact link must be a valid http or https URL.",
    };
  }

  return { ok: true, value: trimmed.slice(0, 300) };
}

export function normalizePublicContactEmail(
  value: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, message: "Contact email is invalid." };
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > 160) {
    return { ok: false, message: "Contact email must be at most 160 characters." };
  }
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, message: "Contact email is invalid." };
  }
  return { ok: true, value: normalized };
}

/**
 * Parse wizard fields. Draft mode requires identity; submit mode requires the
 * full checklist (DB RPC re-validates on submit).
 */
export function parseStoreSetupInput(
  raw: StoreSetupDraftInput,
  mode: "draft" | "submit"
):
  | { ok: true; value: StoreSetupValues }
  | { ok: false; message: string } {
  const storeName =
    typeof raw.storeName === "string" ? raw.storeName.trim() : "";
  if (storeName.length < 2 || storeName.length > 80) {
    return { ok: false, message: "Store name must be 2–80 characters." };
  }

  const slugRaw =
    typeof raw.slug === "string" && raw.slug.trim()
      ? slugify(raw.slug)
      : slugify(storeName);
  if (!isValidSlug(slugRaw)) {
    return { ok: false, message: "Store slug is invalid." };
  }

  const tagline = normalizeOptionalString(raw.tagline, 160);
  const description = normalizeOptionalString(raw.description, 2000);

  let countryCode: string | null = null;
  if (typeof raw.countryCode === "string" && raw.countryCode.trim()) {
    countryCode = raw.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return { ok: false, message: "Country code must be 2 letters." };
    }
  }

  const city = normalizeOptionalString(raw.city, 80);

  const defaultCurrency =
    typeof raw.defaultCurrency === "string" && raw.defaultCurrency.trim()
      ? raw.defaultCurrency.trim().toUpperCase()
      : "USD";
  if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    return { ok: false, message: "Default currency must be a 3-letter code." };
  }

  let storeTemplate: StoreTemplate | null = null;
  if (raw.storeTemplate != null && String(raw.storeTemplate).trim()) {
    if (!isStoreTemplate(raw.storeTemplate)) {
      return { ok: false, message: "Choose a valid store template." };
    }
    storeTemplate = raw.storeTemplate;
  }

  const emailParsed = normalizePublicContactEmail(raw.publicContactEmail);
  if (!emailParsed.ok) return emailParsed;
  const publicContactEmail = emailParsed.value;

  const phoneParsed = normalizePublicContactPhone(raw.publicContactPhone);
  if (!phoneParsed.ok) return phoneParsed;
  const publicContactPhone = phoneParsed.value;

  const urlParsed = normalizePublicContactUrl(raw.publicContactUrl);
  if (!urlParsed.ok) return urlParsed;
  const publicContactUrl = urlParsed.value;

  const returnPolicy = normalizeOptionalString(raw.returnPolicy, 5000);
  const shippingPolicy = normalizeOptionalString(raw.shippingPolicy, 5000);
  const privacyPolicy = normalizeOptionalString(raw.privacyPolicy, 5000);

  const wizardStep = clampWizardStep(raw.wizardStep);

  if (mode === "submit") {
    if (!description || description.length < 20) {
      return {
        ok: false,
        message: "Add a store description of at least 20 characters.",
      };
    }
    if (!city) {
      return { ok: false, message: "City is required before submission." };
    }
    if (!countryCode) {
      return {
        ok: false,
        message: "Country code is required before submission.",
      };
    }
    if (!storeTemplate) {
      return { ok: false, message: "Select a store template before submission." };
    }
    if (!publicContactEmail && !publicContactPhone) {
      return {
        ok: false,
        message: "Provide a public contact email or phone before submission.",
      };
    }
    if (!returnPolicy || returnPolicy.length < 20) {
      return {
        ok: false,
        message: "Return policy must be at least 20 characters.",
      };
    }
    if (!shippingPolicy || shippingPolicy.length < 20) {
      return {
        ok: false,
        message: "Shipping policy must be at least 20 characters.",
      };
    }
  }

  return {
    ok: true,
    value: {
      storeName,
      slug: slugRaw,
      tagline,
      description,
      countryCode,
      city,
      defaultCurrency,
      storeTemplate,
      publicContactEmail,
      publicContactPhone,
      publicContactUrl,
      returnPolicy,
      shippingPolicy,
      privacyPolicy,
      wizardStep,
    },
  };
}

export function applicationToSetupValues(
  row: SellerApplicationRow | null | undefined
): Partial<StoreSetupValues> {
  if (!row) return { wizardStep: 1, defaultCurrency: "USD" };
  return {
    storeName: row.proposed_store_name,
    slug: row.proposed_store_slug,
    tagline: row.proposed_tagline ?? null,
    description: row.proposed_description,
    countryCode: row.country_code,
    city: row.city,
    defaultCurrency: row.default_currency || "USD",
    storeTemplate: isStoreTemplate(row.store_template)
      ? row.store_template
      : null,
    publicContactEmail: row.public_contact_email,
    publicContactPhone: row.public_contact_phone,
    publicContactUrl: row.public_contact_url ?? null,
    returnPolicy: row.return_policy ?? null,
    shippingPolicy: row.shipping_policy ?? null,
    privacyPolicy: row.privacy_policy ?? null,
    wizardStep: clampWizardStep(row.wizard_step ?? 1),
  };
}

export function buildStoreSetupChecklist(
  values: Partial<StoreSetupValues>
): SetupChecklistItem[] {
  const nameOk =
    typeof values.storeName === "string" &&
    values.storeName.trim().length >= 2 &&
    values.storeName.trim().length <= 80;
  const slugOk =
    typeof values.slug === "string" && isValidSlug(values.slug.trim());
  const descriptionOk =
    typeof values.description === "string" &&
    values.description.trim().length >= 20;
  const locationOk = Boolean(
    values.city?.trim() &&
      values.countryCode &&
      /^[A-Z]{2}$/.test(values.countryCode)
  );
  const currencyOk =
    typeof values.defaultCurrency === "string" &&
    /^[A-Z]{3}$/.test(values.defaultCurrency);
  const templateOk = isStoreTemplate(values.storeTemplate);
  const contactOk = Boolean(
    values.publicContactEmail?.trim() || values.publicContactPhone?.trim()
  );
  const returnOk =
    typeof values.returnPolicy === "string" &&
    values.returnPolicy.trim().length >= 20;
  const shippingOk =
    typeof values.shippingPolicy === "string" &&
    values.shippingPolicy.trim().length >= 20;

  return [
    {
      key: "identity",
      label: "Store identity",
      complete: nameOk && slugOk,
      detail: "Name and public slug",
    },
    {
      key: "information",
      label: "Store information",
      complete: descriptionOk && locationOk && currencyOk,
      detail: "Description, city, country, currency",
    },
    {
      key: "template",
      label: "Store template",
      complete: templateOk,
      detail: "Chosen layout style",
    },
    {
      key: "contact",
      label: "Contact information",
      complete: contactOk,
      detail: "Public email or phone",
    },
    {
      key: "policies",
      label: "Store policies",
      complete: returnOk && shippingOk,
      detail: "Return and shipping policies",
    },
  ];
}

export function isStoreSetupComplete(
  values: Partial<StoreSetupValues>
): boolean {
  return buildStoreSetupChecklist(values).every((item) => item.complete);
}

function toDbRow(value: StoreSetupValues) {
  return {
    proposed_store_name: value.storeName,
    proposed_store_slug: value.slug,
    proposed_tagline: value.tagline,
    proposed_description: value.description,
    country_code: value.countryCode,
    city: value.city,
    default_currency: value.defaultCurrency,
    store_template: value.storeTemplate,
    public_contact_email: value.publicContactEmail,
    public_contact_phone: value.publicContactPhone,
    public_contact_url: value.publicContactUrl,
    return_policy: value.returnPolicy,
    shipping_policy: value.shippingPolicy,
    privacy_policy: value.privacyPolicy,
    wizard_step: value.wizardStep,
  };
}

function mapSubmitRpcError(message: string | undefined): string {
  const raw = (message ?? "").toLowerCase();
  if (raw.includes("already pending")) {
    return "Your store setup is already awaiting operator review.";
  }
  if (raw.includes("no draft")) {
    return "Save a store setup draft before submitting.";
  }
  if (raw.includes("not authenticated")) {
    return "Please sign in to submit your store setup.";
  }
  if (raw.includes("template")) {
    return "Select a store template before submission.";
  }
  if (raw.includes("return policy")) {
    return "Return policy must be at least 20 characters.";
  }
  if (raw.includes("shipping policy")) {
    return "Shipping policy must be at least 20 characters.";
  }
  if (raw.includes("description")) {
    return "Add a store description of at least 20 characters.";
  }
  if (raw.includes("city")) {
    return "City is required before submission.";
  }
  if (raw.includes("country")) {
    return "Country code is required before submission.";
  }
  if (raw.includes("email or phone") || raw.includes("contact email or phone")) {
    return "Provide a public contact email or phone before submission.";
  }
  if (raw.includes("contact link") || raw.includes("http")) {
    return "Contact link must be a valid http or https URL.";
  }
  if (raw.includes("slug")) {
    return "Store slug is invalid.";
  }
  return message?.trim() || "Unable to submit store setup.";
}

/** Create or update a draft seller application from the setup wizard. */
export async function saveStoreSetupDraft(
  supabase: AnyClient,
  userId: string,
  raw: StoreSetupDraftInput
): Promise<SellerApplicationResult<SellerApplicationRow>> {
  const existing = await getLatestSellerApplication(supabase, userId);

  if (existing && OPEN_SELLER_APPLICATION_STATUSES.includes(existing.status)) {
    if (existing.status === "draft") {
      // continue below
    } else if (existing.status === "approved") {
      return {
        ok: false,
        message: "You already have an approved seller account.",
      };
    } else {
      return {
        ok: false,
        message:
          "You already have an open seller application under review or suspended.",
      };
    }
  }

  const parsed = parseStoreSetupInput(raw, "draft");
  if (!parsed.ok) return parsed;

  const payload = toDbRow(parsed.value);

  if (existing?.status === "draft") {
    const { data, error } = await supabase
      .from("seller_applications")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .eq("status", "draft")
      .select("*")
      .single();

    if (error || !data) {
      console.error("saveStoreSetupDraft update", error);
      if (error?.code === "23505") {
        return {
          ok: false,
          message: "That store slug is already reserved by another application.",
        };
      }
      return { ok: false, message: "Unable to save store setup draft." };
    }
    return { ok: true, data: data as SellerApplicationRow };
  }

  const { data, error } = await supabase
    .from("seller_applications")
    .insert({
      user_id: userId,
      status: "draft",
      ...payload,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("saveStoreSetupDraft insert", error);
    if (error?.code === "23505") {
      return {
        ok: false,
        message:
          "That store slug is already reserved, or you already have an open application.",
      };
    }
    return { ok: false, message: "Unable to save store setup draft." };
  }

  return { ok: true, data: data as SellerApplicationRow };
}

/**
 * Persist the latest wizard values as a draft, then atomically submit via
 * `submit_my_seller_application` (DB-enforced checklist + draft→pending).
 */
export async function submitStoreSetup(
  supabase: AnyClient,
  userId: string,
  raw: StoreSetupDraftInput
): Promise<SellerApplicationResult<SellerApplicationRow>> {
  const existing = await getLatestSellerApplication(supabase, userId);

  if (existing && OPEN_SELLER_APPLICATION_STATUSES.includes(existing.status)) {
    if (existing.status === "draft") {
      // continue
    } else if (existing.status === "approved") {
      return {
        ok: false,
        message: "You already have an approved seller account.",
      };
    } else if (existing.status === "pending") {
      return {
        ok: false,
        message: "Your store setup is already awaiting operator review.",
      };
    } else {
      return {
        ok: false,
        message: "Your seller account is suspended.",
      };
    }
  }

  const parsed = parseStoreSetupInput(raw, "submit");
  if (!parsed.ok) return parsed;

  if (!isStoreSetupComplete(parsed.value)) {
    return {
      ok: false,
      message: "Complete every checklist item before submitting for approval.",
    };
  }

  // Always land values in a draft first — clients cannot insert/update pending.
  const draftSave = await saveStoreSetupDraft(supabase, userId, {
    ...raw,
    wizardStep: 6,
  });
  if (!draftSave.ok) return draftSave;

  const { data: submittedId, error } = await supabase.rpc(
    SUBMIT_MY_SELLER_APPLICATION_RPC
  );

  if (error || !submittedId) {
    console.error("submitStoreSetup rpc", error);
    if (error?.code === "23505") {
      return {
        ok: false,
        message:
          "That store slug is already reserved, or you already have an open application.",
      };
    }
    return { ok: false, message: mapSubmitRpcError(error?.message) };
  }

  const { data, error: reloadError } = await supabase
    .from("seller_applications")
    .select("*")
    .eq("id", submittedId)
    .eq("user_id", userId)
    .maybeSingle();

  if (reloadError || !data) {
    console.error("submitStoreSetup reload", reloadError);
    return {
      ok: true,
      data: {
        ...draftSave.data,
        status: "pending",
        wizard_step: 6,
      } as SellerApplicationRow,
    };
  }

  return { ok: true, data: data as SellerApplicationRow };
}
