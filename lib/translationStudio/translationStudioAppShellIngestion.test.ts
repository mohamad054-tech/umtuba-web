import { describe, expect, it } from "vitest";
import { enMessages } from "../i18n/messages/en";
import {
  buildAppShellPublishBatch,
  classifyImportedValueStatus,
  ingestAppShellCatalog,
  isAppShellCatalogKey,
  sourceFingerprint,
  stableAppShellKeyId,
  summarizeFindings,
  validateAppShellTerminology,
} from "./index";

describe("App Shell catalog ingestion", () => {
  it("ingests App Shell keys with stable ids and no duplicates", () => {
    const { state, report } = ingestAppShellCatalog(null);
    const appKeys = Object.keys(enMessages).filter(isAppShellCatalogKey);
    expect(report.keyCount).toBe(appKeys.length);
    expect(state.keys).toHaveLength(appKeys.length);

    const ids = new Set(state.keys.map((k) => k.id));
    expect(ids.size).toBe(state.keys.length);
    expect(state.keys.every((k) => k.id === stableAppShellKeyId(k.key))).toBe(
      true
    );
  });

  it("is idempotent on re-ingest (no duplicate keys)", () => {
    const first = ingestAppShellCatalog(null);
    const second = ingestAppShellCatalog(first.state);
    expect(second.state.keys).toHaveLength(first.state.keys.length);
    expect(second.report.createdKeys).toBe(0);
    expect(second.state.values).toHaveLength(first.state.values.length);
  });

  it("marks FR/ES/DE/PT English fallback as needs_review, not approved", () => {
    expect(
      classifyImportedValueStatus({
        language: "fr",
        sourceText: "Home",
        catalogValue: "Home",
      })
    ).toBe("needs_review");
    expect(
      classifyImportedValueStatus({
        language: "de",
        sourceText: "Save",
        catalogValue: "Save",
      })
    ).toBe("needs_review");

    const { state } = ingestAppShellCatalog(null);
    const falselyApproved = state.values.filter(
      (v) =>
        ["fr", "es", "de", "pt"].includes(v.language) &&
        v.value.trim() !== "" &&
        v.status === "approved"
    );
    expect(falselyApproved).toHaveLength(0);
  });

  it("approves English source and valid Arabic; flags EN leakage in AR", () => {
    expect(
      classifyImportedValueStatus({
        language: "en",
        sourceText: "Home",
        catalogValue: "Home",
      })
    ).toBe("approved");
    expect(
      classifyImportedValueStatus({
        language: "ar",
        sourceText: "Home",
        catalogValue: "الرئيسية",
      })
    ).toBe("approved");
    expect(
      classifyImportedValueStatus({
        language: "ar",
        sourceText: "Home",
        catalogValue: "Home",
      })
    ).toBe("needs_review");
  });

  it("marks dependent translations needs_review when source text changes", () => {
    const first = ingestAppShellCatalog(null);
    expect(first.state.keys.find((k) => k.key === "nav.home")).toBeTruthy();
    const withStaleSource = {
      ...first.state,
      keys: first.state.keys.map((k) =>
        k.key === "nav.home" ? { ...k, sourceText: "LEGACY HOME" } : k
      ),
    };
    const second = ingestAppShellCatalog(withStaleSource);
    expect(second.report.staleSourceKeys).toContain("nav.home");
    const ar = second.state.values.find(
      (v) => v.keyId === stableAppShellKeyId("nav.home") && v.language === "ar"
    );
    expect(ar?.status).toBe("needs_review");
  });

  it("seeds Arabic Translation Memory with unique key-scoped stable ids", () => {
    const { state, report } = ingestAppShellCatalog(null);
    expect(report.memorySeeded).toBeGreaterThan(0);
    const ar = state.memory.filter((m) => m.language === "ar");
    const ids = ar.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Truncated-fingerprint collisions must not occur (e.g. nothing here / something we).
    expect(ids).not.toContain("tm_appshell_nothing here_ar");
    expect(ids).not.toContain("tm_appshell_something we_ar");
    expect(ids).toContain("tm_appshell_status__empty_ar");
    expect(ids).toContain("tm_appshell_empty__title_ar");
    expect(ids).toContain("tm_appshell_status__error_ar");
    expect(ids).toContain("tm_appshell_error__title_ar");

    const again = ingestAppShellCatalog(state);
    const ar2 = again.state.memory.filter((m) => m.language === "ar");
    expect(ar2.length).toBe(ar.length);
    expect(again.report.memorySeeded).toBe(0);
    expect(again.report.memoryReused).toBeGreaterThan(0);

    const save = ar.find((m) => m.sourceText === "Save");
    expect(save?.translatedText).toBeTruthy();
    expect(sourceFingerprint("Save")).toBe(save?.sourceFingerprint);
  });

  it("reports terminology findings without mutating approved values", () => {
    const { state } = ingestAppShellCatalog(null);
    const before = state.values
      .filter((v) => v.language === "ar" && v.status === "approved")
      .map((v) => v.value);
    const findings = validateAppShellTerminology(state);
    expect(findings).toHaveProperty("conflictingArabic");
    expect(findings).toHaveProperty("englishLeakageInArabic");
    const after = state.values
      .filter((v) => v.language === "ar" && v.status === "approved")
      .map((v) => v.value);
    expect(after).toEqual(before);
  });

  it("publish batch is dry-run, approved-only, and lists changed keys", () => {
    const { state } = ingestAppShellCatalog(null);
    const batch = buildAppShellPublishBatch(state);
    expect(batch.dryRun).toBe(true);
    expect(batch.autoPublish).toBe(false);
    expect(batch.writesCatalogFiles).toBe(false);
    expect(
      batch.records.every(
        (r) => r.status === "approved" || r.status === "ready_for_publish"
      )
    ).toBe(true);
    expect(batch.changedKeys.length).toBe(batch.preview.keyCount);
    expect(batch.records.some((r) => r.language === "fr")).toBe(false);
    expect(batch.records.some((r) => r.language === "en")).toBe(true);
    expect(batch.records.some((r) => r.language === "ar")).toBe(true);
  });

  it("reports inventory counts for handoff", () => {
    const { state, report } = ingestAppShellCatalog(null);
    const findings = validateAppShellTerminology(state);
    const summary = summarizeFindings(findings);
    const batch = buildAppShellPublishBatch(state);
    const keyCount = Object.keys(enMessages).filter(isAppShellCatalogKey).length;
    expect(report.keyCount).toBe(keyCount);
    expect(report.statusCounts.en?.approved).toBe(keyCount);
    expect(report.statusCounts.ar?.approved).toBe(keyCount);
    expect(report.statusCounts.ar?.needs_review ?? 0).toBe(0);
    expect(report.statusCounts.fr?.needs_review).toBe(keyCount);
    expect(report.statusCounts.es?.needs_review).toBe(keyCount);
    expect(report.statusCounts.de?.needs_review).toBe(keyCount);
    expect(report.statusCounts.pt?.needs_review).toBe(keyCount);
    expect(report.statusCounts.fr?.approved ?? 0).toBe(0);
    expect(report.memorySeeded).toBe(
      state.memory.filter((m) => m.language === "ar").length
    );
    expect(batch.preview.byLanguage.en).toBe(keyCount);
    expect(batch.preview.byLanguage.ar).toBe(keyCount);
    expect(summary.leakageCount).toBe(0);
    expect(summary.conflictCount).toBe(0);
    expect(summary.capitalizationIssues).toBe(0);
    expect(summary.duplicateTranslationIssues).toBe(1);
  });
});
