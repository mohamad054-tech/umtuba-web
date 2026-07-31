import { describe, expect, it } from "vitest";
import { learningEnMessages } from "../i18n/messages/learning/en";
import {
  buildLearningPublishBatch,
  createTranslationStudio,
  ingestAppShellCatalog,
  ingestLearningCatalog,
  isLearningCatalogKey,
  learningNamespaceOfKey,
  resetTranslationIntelligenceForTests,
  seedLearningTerminology,
  stableLearningKeyId,
  validateLearningCatalogQuality,
} from "./index";

describe("Learning Translation Studio foundation", () => {
  it("ingests Learning platform UI keys with stable ids", () => {
    const appShell = ingestAppShellCatalog(null, {
      actorId: "test",
    });
    const { state, report } = ingestLearningCatalog(appShell.state, {
      ephemeralIntelligence: true,
    });
    const learningKeys = Object.keys(learningEnMessages);
    expect(report.keyCount).toBe(learningKeys.length);
    expect(
      state.keys.filter((k) => isLearningCatalogKey(k.key))
    ).toHaveLength(learningKeys.length);
    expect(
      state.keys
        .filter((k) => isLearningCatalogKey(k.key))
        .every((k) => k.id === stableLearningKeyId(k.key))
    ).toBe(true);
  });

  it("maps namespaces for Learning areas", () => {
    expect(learningNamespaceOfKey("learning.programs.title")).toBe(
      "learning.programs"
    );
    expect(learningNamespaceOfKey("learning.live.join")).toBe("learning.live");
  });

  it("is idempotent and does not duplicate Learning keys", () => {
    const first = ingestLearningCatalog(
      ingestAppShellCatalog(null).state,
      { ephemeralIntelligence: true }
    );
    const second = ingestLearningCatalog(first.state, {
      ephemeralIntelligence: true,
    });
    expect(second.report.createdKeys).toBe(0);
    expect(
      second.state.keys.filter((k) => isLearningCatalogKey(k.key)).length
    ).toBe(first.state.keys.filter((k) => isLearningCatalogKey(k.key)).length);
  });

  it("approves EN/AR and keeps FR fallback as needs_review", () => {
    const { report } = ingestLearningCatalog(null, {
      ephemeralIntelligence: true,
    });
    expect(report.statusCounts.en?.approved).toBe(report.keyCount);
    expect(report.statusCounts.ar?.approved).toBe(report.keyCount);
    expect(report.statusCounts.fr?.approved ?? 0).toBe(0);
    expect(report.statusCounts.fr?.needs_review).toBe(report.keyCount);
  });

  it("seeds Arabic Learning Translation Memory without fingerprint duplicates", () => {
    const { state, report } = ingestLearningCatalog(null, {
      ephemeralIntelligence: true,
    });
    expect(report.memorySeeded).toBeGreaterThan(0);
    const ar = state.memory.filter(
      (m) => m.language === "ar" && m.id.startsWith("tm_learning_")
    );
    const fps = ar.map((m) => `${m.sourceFingerprint}:${m.language}`);
    expect(new Set(fps).size).toBe(fps.length);
  });

  it("records Translation Intelligence for approved Learning values", () => {
    resetTranslationIntelligenceForTests();
    const { report } = ingestLearningCatalog(null, {
      ephemeralIntelligence: true,
    });
    expect(report.intelligenceRecorded).toBeGreaterThan(0);
  });

  it("seeds official Learning terminology", () => {
    const terms = seedLearningTerminology();
    expect(terms.some((t) => t.term === "Continue Learning")).toBe(true);
    expect(terms.some((t) => t.term === "Live Session")).toBe(true);
    expect(terms.every((t) => t.translations.ar)).toBe(true);
  });

  it("builds Learning publish batch as dry-run approved-only", () => {
    const { state } = ingestLearningCatalog(null, {
      ephemeralIntelligence: true,
    });
    const batch = buildLearningPublishBatch(state);
    expect(batch.dryRun).toBe(true);
    expect(batch.autoPublish).toBe(false);
    expect(batch.writesCatalogFiles).toBe(false);
    expect(batch.domain).toBe("learning");
    expect(batch.records.every((r) => r.key.startsWith("learning."))).toBe(
      true
    );
    expect(batch.records.some((r) => r.language === "fr")).toBe(false);
  });

  it("reports Learning quality findings without auto-correct", () => {
    const { state } = ingestLearningCatalog(null, {
      ephemeralIntelligence: true,
    });
    const before = state.values.map((v) => v.value);
    const findings = validateLearningCatalogQuality(state);
    expect(findings).toHaveProperty("terminologyConflicts");
    expect(findings).toHaveProperty("englishLeakage");
    expect(findings.staleTranslations.length).toBeGreaterThan(0);
    expect(state.values.map((v) => v.value)).toEqual(before);
  });

  it("studio seed includes Learning keys alongside App Shell", () => {
    const studio = createTranslationStudio({ ephemeral: true });
    const snap = studio.getSnapshot();
    expect(snap.keys.some((k) => k.key.startsWith("learning."))).toBe(true);
    expect(snap.keys.some((k) => k.key.startsWith("nav."))).toBe(true);
    expect(
      snap.terminology.some((t) => t.term === "Continue Learning")
    ).toBe(true);
  });
});
