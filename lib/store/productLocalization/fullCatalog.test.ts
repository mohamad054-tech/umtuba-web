import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatCurrency } from "../../i18n/format";
import { customerSafeLocalizedCopy, readLocalizationCatalogFile } from "./catalogFile";
import { LOCALIZATION_QA_SAMPLE_IDS } from "./constants";
import { frozenGoldCopy } from "./goldStandard";
import { evaluateLocalizationQuality } from "./qualityGate";
import { readLocalizationQaSampleFile } from "./sampleFile";

describe("full catalog localization", () => {
  it("reuses the frozen gold-standard 20 without rewriting them", () => {
    const sample = readLocalizationQaSampleFile();
    expect(sample?.products).toHaveLength(20);
    expect(sample?.quality_gate.status).toBe("PASS");
    for (const id of LOCALIZATION_QA_SAMPLE_IDS) {
      const frozen = sample?.products.find((row) => row.cj_product_id === id)?.localized;
      expect(frozenGoldCopy(id)).toEqual(frozen);
    }
  });

  it("accounts for all 532 products and reports expansion review honestly", () => {
    const catalog = readLocalizationCatalogFile();
    expect(catalog).not.toBeNull();
    expect(typeof catalog?.paid_ai_used).toBe("boolean");
    expect(catalog?.arabic_localization_owner_pass).toBe(true);
    expect(catalog?.metrics.gold_standard_preserved).toBe(20);
    expect(catalog?.metrics.total_products).toBe(532);
    const approved = catalog?.products.filter((row) => row.source === "approved_59") ?? [];
    expect(approved).toHaveLength(59);
    const approvedReady = approved.filter((row) => row.status !== "manual_review_required");
    expect(approvedReady.length).toBe(59);
    for (const row of approvedReady) {
      expect(row.quality.ok, row.cj_product_id).toBe(true);
      expect(row.localized.title_ar).toMatch(/[\u0600-\u06FF]/);
    }
    const shippedClaims =
      catalog?.products.filter(
        (row) =>
          row.status !== "manual_review_required" &&
          row.quality.findings.some((finding) => finding.code === "unsupported_claim")
      ).length ?? 0;
    expect(shippedClaims).toBe(0);
    expect(catalog?.paid_ai_required).toBe(catalog!.metrics.manual_review_required > 0);
  });

  it("keeps numeric facts and rejects unsupported claims on shipped rows", () => {
    const catalog = readLocalizationCatalogFile();
    const shipped = catalog?.products.filter((row) => row.status !== "manual_review_required") ?? [];
    for (const row of shipped) {
      const gate = evaluateLocalizationQuality(row, row.localized);
      expect(gate.findings.filter((item) => item.code === "unsupported_claim"), row.cj_product_id).toEqual(
        []
      );
      expect(
        gate.findings.filter((item) =>
          ["lost_quantity", "lost_dimension", "changed_numeric_value"].includes(item.code)
        ),
        row.cj_product_id
      ).toEqual([]);
    }
  });

  it("does not leak CJ internals through customer-safe copy", () => {
    const catalog = readLocalizationCatalogFile();
    const gold = catalog?.products.find((row) => row.status === "gold_standard");
    expect(gold).toBeTruthy();
    const copy = customerSafeLocalizedCopy(gold!.cj_product_id);
    expect(copy?.title_ar).toBe(gold!.localized.title_ar);
    const blob = JSON.stringify(copy);
    expect(blob).not.toMatch(/cj_product_id|landed_cost|gross_margin/);
    expect(formatCurrency("ar", 49.99, "USD")).toBe("49.99 US$");
  });

  it("keeps catalog QA flags on every 532 row", () => {
    const catalog = readLocalizationCatalogFile();
    expect(catalog?.products).toHaveLength(532);
    for (const row of catalog?.products ?? []) {
      expect(Array.isArray(row.catalog_qa), row.cj_product_id).toBe(true);
    }
    expect(catalog?.metrics.ip_review).toBeGreaterThanOrEqual(0);
    expect(catalog?.paid_ai_estimate?.note).toMatch(/Cap \$5|No paid API was called/);
  });

  it("keeps paid provider modules free of API keys", () => {
    const src = readFileSync(join(process.cwd(), "lib/store/productLocalization/paidProviders.ts"), "utf8");
    expect(src).not.toMatch(/OPENAI_API_KEY|GEMINI_API_KEY|process\.env/);
  });
});
