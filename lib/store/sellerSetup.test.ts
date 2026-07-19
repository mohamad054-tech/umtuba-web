import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OPEN_SELLER_APPLICATION_STATUSES,
  SELLER_APPLICATION_STATUSES,
  applyToBecomeSeller,
} from "./sellerApplications";
import {
  STORE_SETUP_STEPS,
  STORE_TEMPLATES,
  SUBMIT_MY_SELLER_APPLICATION_RPC,
  applicationToSetupValues,
  buildStoreSetupChecklist,
  isStoreSetupComplete,
  isStoreTemplate,
  normalizePublicContactEmail,
  normalizePublicContactPhone,
  normalizePublicContactUrl,
  parseStoreSetupInput,
} from "./sellerSetup";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { isProtectedPath } from "../env/supabaseAuthGate";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260810_store_seller_self_service_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const completeRaw = {
  storeName: "Cedar Boutique",
  slug: "cedar-boutique",
  tagline: "Curated goods",
  description: "A carefully curated boutique for everyday essentials.",
  countryCode: "US",
  city: "Austin",
  defaultCurrency: "USD",
  storeTemplate: "boutique",
  publicContactEmail: "Hello@Cedar.Example",
  publicContactPhone: "+1 (555) 121-2345",
  publicContactUrl: "https://cedar.example",
  returnPolicy: "Returns accepted within 30 days in original condition.",
  shippingPolicy: "Ships within 3 business days via standard carriers.",
  privacyPolicy: "We only use contact details for order updates.",
  wizardStep: 6,
};

describe("seller self-service statuses and templates", () => {
  it("includes draft in application statuses and open-set", () => {
    expect(SELLER_APPLICATION_STATUSES).toContain("draft");
    expect(OPEN_SELLER_APPLICATION_STATUSES).toContain("draft");
    expect(OPEN_SELLER_APPLICATION_STATUSES).toContain("pending");
  });

  it("exposes the five store templates and six wizard steps", () => {
    expect(STORE_TEMPLATES).toEqual([
      "boutique",
      "marketplace",
      "digital",
      "services",
      "general",
    ]);
    expect(STORE_SETUP_STEPS).toHaveLength(6);
    expect(isStoreTemplate("boutique")).toBe(true);
    expect(isStoreTemplate("unknown")).toBe(false);
  });
});

describe("store setup validation hardening", () => {
  it("accepts a complete payload for submit and normalizes email", () => {
    const parsed = parseStoreSetupInput(completeRaw, "submit");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.storeTemplate).toBe("boutique");
    expect(parsed.value.publicContactEmail).toBe("hello@cedar.example");
    expect(parsed.value.publicContactPhone).toBe("+1 (555) 121-2345");
  });

  it("allows incomplete optional fields when saving a draft", () => {
    const parsed = parseStoreSetupInput(
      {
        storeName: "Cedar Boutique",
        slug: "cedar-boutique",
        wizardStep: 2,
      },
      "draft"
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects invalid identity, template, and incomplete submit payloads", () => {
    expect(
      parseStoreSetupInput({ storeName: "A", slug: "x" }, "draft").ok
    ).toBe(false);
    expect(
      parseStoreSetupInput(
        { storeName: "Cedar", slug: "a", storeTemplate: "neon" },
        "draft"
      ).ok
    ).toBe(false);
    expect(
      parseStoreSetupInput(
        { storeName: "Cedar Boutique", slug: "cedar-boutique" },
        "submit"
      ).ok
    ).toBe(false);
    expect(
      parseStoreSetupInput({ ...completeRaw, storeTemplate: "neon" }, "submit")
        .ok
    ).toBe(false);
  });

  it("rejects javascript/data/file URL schemes and malformed URLs", () => {
    expect(normalizePublicContactUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizePublicContactUrl("data:text/html,hi").ok).toBe(false);
    expect(normalizePublicContactUrl("file:///etc/passwd").ok).toBe(false);
    expect(normalizePublicContactUrl("ftp://files.example").ok).toBe(false);
    expect(normalizePublicContactUrl("not a url").ok).toBe(false);
    expect(normalizePublicContactUrl("https://ok.example/path").ok).toBe(true);
    expect(normalizePublicContactUrl("").ok).toBe(true);
    expect(normalizePublicContactUrl("   ").ok).toBe(true);
  });

  it("normalizes email/phone and rejects invalid phone characters", () => {
    const email = normalizePublicContactEmail("  A@B.C  ");
    expect(email.ok).toBe(true);
    if (email.ok) expect(email.value).toBe("a@b.c");
    expect(normalizePublicContactPhone("+1 (555) 000-1111").ok).toBe(true);
    expect(normalizePublicContactPhone("call-me!!!").ok).toBe(false);
    expect(normalizePublicContactPhone("123").ok).toBe(false);
  });
});

describe("completion checklist", () => {
  it("marks incomplete drafts and complete submissions correctly", () => {
    expect(isStoreSetupComplete({ storeName: "Cedar", slug: "cedar" })).toBe(
      false
    );
    const parsed = parseStoreSetupInput(completeRaw, "submit");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(isStoreSetupComplete(parsed.value)).toBe(true);
    expect(
      buildStoreSetupChecklist(parsed.value).every((i) => i.complete)
    ).toBe(true);
  });

  it("maps application rows into wizard values", () => {
    const values = applicationToSetupValues({
      id: "a",
      user_id: "u",
      status: "draft",
      proposed_store_name: "Cedar Boutique",
      proposed_store_slug: "cedar-boutique",
      proposed_description: "A carefully curated boutique for everyday essentials.",
      proposed_tagline: "Curated",
      country_code: "US",
      city: "Austin",
      public_contact_email: "hello@cedar.example",
      public_contact_phone: null,
      public_contact_url: "https://cedar.example",
      default_currency: "USD",
      store_template: "boutique",
      return_policy: "Returns accepted within 30 days in original condition.",
      shipping_policy: "Ships within 3 business days via standard carriers.",
      privacy_policy: null,
      wizard_step: 4,
      store_id: null,
      review_note: null,
      reviewed_at: null,
      created_at: "",
      updated_at: "",
    });
    expect(values.storeTemplate).toBe("boutique");
    expect(values.wizardStep).toBe(4);
  });
});

describe("seller self-service migration contracts (DB fail-closed)", () => {
  it("ships draft-only client RLS and atomic submit RPC", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);

    // 1) Draft insert allowed for owner (policy shape)
    expect(sql).toMatch(/Users insert own draft seller applications/);
    expect(sql).toMatch(
      /with check \(\s*user_id = auth\.uid\(\)\s*and status = 'draft'\s*\)/
    );

    // 2) Direct pending insert denied (prior pending/draft insert policy dropped;
    //    created insert policy allows draft only)
    expect(sql).toMatch(
      /drop policy if exists "Users insert own draft or pending seller applications"/
    );
    const insertStart = sql.indexOf(
      'create policy "Users insert own draft seller applications"'
    );
    const insertNext = sql.indexOf("create policy", insertStart + 1);
    const insertBody = sql.slice(
      insertStart,
      insertNext > insertStart ? insertNext : undefined
    );
    expect(insertBody).toMatch(/status = 'draft'/);
    expect(insertBody).not.toMatch(/status in \('draft', 'pending'\)/);
    expect(insertBody).not.toMatch(/status = 'pending'/);

    // 3–4) Owner can update own draft; non-owner denied via user_id = auth.uid()
    expect(sql).toMatch(/Users update own draft seller applications/);
    expect(sql).toMatch(
      /using \(user_id = auth\.uid\(\) and status = 'draft'\)/
    );
    expect(sql).toMatch(
      /with check \(\s*user_id = auth\.uid\(\)\s*and status = 'draft'\s*\)/
    );

    // 5–8) Pending/approved/rejected/suspended cannot be seller-edited
    // (update using/with check require status = draft only; prior pending update dropped)
    expect(sql).toMatch(
      /drop policy if exists "Users update own pending seller applications"/
    );
    const updateStart = sql.indexOf(
      'create policy "Users update own draft seller applications"'
    );
    const updateNext = sql.indexOf("create policy", updateStart + 1);
    const updateBody = sql.slice(
      updateStart,
      updateNext > updateStart ? updateNext : undefined
    );
    expect(updateBody).toMatch(
      /using \(user_id = auth\.uid\(\) and status = 'draft'\)/
    );
    expect(updateBody).toMatch(/status = 'draft'/);
    expect(updateBody).not.toMatch(/status in \('draft', 'pending'\)/);

    // 9–11, 15) Submit RPC validates checklist and transitions atomically
    expect(sql).toMatch(
      /create or replace function public\.submit_my_seller_application\(\)/
    );
    expect(sql).toMatch(/assert_seller_application_ready_for_review/);
    expect(sql).toMatch(/status = 'draft'/);
    expect(sql).toMatch(/status = 'pending'/);
    expect(sql).toMatch(/Seller application is already pending review/);
    expect(sql).toMatch(/No draft seller application found/);
    expect(sql).toMatch(/Store template is required/);
    expect(sql).toMatch(/Return policy must be at least 20 characters/);

    // 12) Invalid wizard_step rejected at DB boundary
    expect(sql).toMatch(
      /seller_applications_wizard_step_check[\s\S]*wizard_step >= 1 and wizard_step <= 6/
    );

    // 13–14) Duplicate open application / slug rejected
    expect(sql).toMatch(/seller_applications_one_open_per_user_uidx/);
    expect(sql).toMatch(/seller_applications_open_slug_uidx/);
    expect(sql).toMatch(
      /where status in \('draft', 'pending', 'approved', 'suspended'\)/
    );
    expect(sql).toMatch(/where status in \('draft', 'pending'\)/);

    // 16) Submission RPC cannot target another user's draft
    expect(sql).toMatch(/where user_id = uid\s*and status = 'draft'/);
    expect(sql).not.toMatch(/submit_my_seller_application\(.*uuid/i);
    expect(sql).toMatch(
      /grant execute on function public\.submit_my_seller_application\(\) to authenticated, service_role;/
    );

    // 18) Approve RPC rejects incomplete pending
    const approveFn = sql.slice(
      sql.indexOf("create or replace function public.approve_seller_application")
    );
    const adminApproveFn = sql.slice(
      sql.indexOf(
        "create or replace function public.admin_approve_seller_application"
      )
    );
    expect(approveFn).toMatch(/assert_seller_application_ready_for_review\(app\)/);
    expect(adminApproveFn).toMatch(
      /assert_seller_application_ready_for_review\(app\)/
    );

    // 19) URL schemes javascript/data/file rejected at DB
    expect(sql).toMatch(/public_contact_url ~\* '\^https\?:\/\//);
    expect(sql).toMatch(/\(javascript\|data\|file\):/);
  });

  it("wires setup routes, actions, submit RPC usage, and legacy disablement", () => {
    expect(APP_ROUTES.sellerSetup).toBe("/seller/setup");
    expect(isProtectedPath("/seller/setup")).toBe(true);
    expect(SUBMIT_MY_SELLER_APPLICATION_RPC).toBe(
      "submit_my_seller_application"
    );

    const applyPage = read("app/seller/apply/page.tsx");
    expect(applyPage).toMatch(/redirect\(APP_ROUTES\.sellerSetup\)/);

    const setupPage = read("app/seller/setup/page.tsx");
    expect(setupPage).toMatch(/StoreSetupWizard/);

    const actions = read("app/actions/storeSellerSetup.ts");
    expect(actions).toMatch(/submitStoreSetupAction/);
    expect(actions).toMatch(/saveStoreSetupDraftAction/);

    const domain = read("lib/store/sellerSetup.ts");
    expect(domain).toMatch(/SUBMIT_MY_SELLER_APPLICATION_RPC/);
    expect(domain).toMatch(/\.rpc\(\s*SUBMIT_MY_SELLER_APPLICATION_RPC/);
    expect(domain).toMatch(/normalizePublicContactUrl/);

    // 17) Legacy action cannot bypass wizard validation
    const legacyAction = read("app/actions/storeSeller.ts");
    expect(legacyAction).toMatch(/sellerSetup/);
    expect(legacyAction).not.toMatch(/applyToBecomeSeller/);
    expect(legacyAction).not.toMatch(/status:\s*['"]pending['"]/);
  });
});

describe("legacy path fail-closed", () => {
  it("applyToBecomeSeller always rejects and points at the wizard", async () => {
    const result = await applyToBecomeSeller({} as never, "user-1", {
      storeName: "Cedar Boutique",
      slug: "cedar-boutique",
      description: "A carefully curated boutique for everyday essentials.",
      city: "Austin",
      countryCode: "US",
      publicContactEmail: "hello@cedar.example",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/\/seller\/setup/);
  });
});
