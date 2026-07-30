import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPublishContract,
  canTransitionTranslationStatus,
  createTranslationStudioWorkflow,
  detectTerminologyConflicts,
  isPublishCatalogEligible,
  resetTranslationStudioWorkflowForTests,
  seedUmtubaTerminology,
} from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  resetTranslationStudioWorkflowForTests();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "umtuba-ts-"));
  tempDirs.push(dir);
  return dir;
}

describe("Translation Studio persistence workflow", () => {
  it("persists drafts across workflow instances (survives restart)", () => {
    const dataDir = tempDataDir();
    const a = createTranslationStudioWorkflow({ dataDir });
    const draftable = a
      .getSnapshot()
      .values.find((v) => v.language === "fr" && v.status === "needs_review");
    expect(draftable).toBeTruthy();

    a.saveDraft({
      valueId: draftable!.id,
      text: "Brouillon persisté",
      actor: { userId: "user_a" },
    });

    const b = createTranslationStudioWorkflow({ dataDir });
    const reloaded = b.getValue(draftable!.id);
    expect(reloaded?.value).toBe("Brouillon persisté");
    expect(reloaded?.status).toBe("draft");
    expect(reloaded?.version).toBeGreaterThan(draftable!.version);

    const raw = JSON.parse(
      readFileSync(join(dataDir, "store.json"), "utf8")
    ) as { schemaVersion: number };
    expect(raw.schemaVersion).toBe(1);
  });

  it("runs draft → review → approve → ready_for_publish with history + audit", () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value =
      wf.getSnapshot().values.find((v) => v.status === "missing") ??
      wf.getSnapshot().values.find((v) => v.language === "de");
    expect(value).toBeTruthy();

    const drafted = wf.saveDraft({
      valueId: value!.id,
      text: "Speichern",
      actor: { userId: "editor_1" },
    });
    expect(drafted.status).toBe("draft");

    const submitted = wf.submitForReview({
      valueId: drafted.id,
      actor: { userId: "editor_1" },
    });
    expect(submitted.status).toBe("needs_review");

    const approved = wf.approve({
      valueId: submitted.id,
      actor: { userId: "reviewer_1" },
    });
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe("reviewer_1");

    const ready = wf.approve({
      valueId: approved.id,
      actor: { userId: "reviewer_1" },
      markReadyForPublish: true,
    });
    expect(ready.status).toBe("ready_for_publish");

    const history = wf.getHistory(value!.id);
    expect(history.length).toBeGreaterThanOrEqual(4);
    expect(wf.getAudit(value!.id).some((a) => a.action === "approve")).toBe(
      true
    );

    const memoryHit = wf
      .getSnapshot()
      .memory.find(
        (m) =>
          m.language === value!.language && m.translatedText === "Speichern"
      );
    expect(memoryHit).toBeTruthy();
  });

  it("rejects illegal status jumps", () => {
    expect(canTransitionTranslationStatus("approved", "missing")).toBe(false);
    expect(canTransitionTranslationStatus("deprecated", "approved")).toBe(
      false
    );
    expect(canTransitionTranslationStatus("needs_review", "approved")).toBe(
      true
    );
  });

  it("warns on terminology conflicts without silent replace", () => {
    const terms = seedUmtubaTerminology();
    const conflicts = detectTerminologyConflicts({
      candidateText: "Open Learning now",
      language: "ar",
      terminology: terms,
    });
    expect(conflicts.some((c) => c.term === "Learning")).toBe(true);
    expect(conflicts.every((c) => c.severity === "warning")).toBe(true);
  });

  it("AI suggestion stays pending human review (never auto-approved)", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf
      .getSnapshot()
      .values.find((v) => v.language === "ar" && v.status === "approved");
    expect(value).toBeTruthy();

    const suggestion = await wf.requestAiSuggestion({
      valueId: value!.id,
      actor: { userId: "ai_user" },
    });
    expect(suggestion.status).toBe("pending_review");
    expect(suggestion.quality.terminologyConflicts).toBeDefined();

    const after = wf.getValue(value!.id);
    expect(after?.status).toBe("ai_suggested");
    expect(after?.status).not.toBe("approved");
  });

  it("publish contract excludes non-eligible statuses and never auto-publishes", () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const contract = buildPublishContract(wf.getSnapshot());
    expect(contract.autoPublish).toBe(false);
    expect(contract.format).toBe("umtuba.translation_publish_catalog.v1");
    for (const record of contract.records) {
      expect(isPublishCatalogEligible(record.status)).toBe(true);
      expect(["approved", "ready_for_publish"]).toContain(record.status);
    }
  });

  it("reject and restore cycle works", () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf
      .getSnapshot()
      .values.find((v) => v.status === "needs_review");
    expect(value).toBeTruthy();

    const rejected = wf.reject({
      valueId: value!.id,
      actor: { userId: "reviewer_2" },
      note: "Wrong tone",
    });
    expect(rejected.status).toBe("rejected");

    const restored = wf.restore({
      valueId: rejected.id,
      actor: { userId: "editor_2" },
    });
    expect(restored.status).toBe("draft");
  });
});
