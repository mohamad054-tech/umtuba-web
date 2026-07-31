import { afterEach, describe, expect, it } from "vitest";
import { LEARNING_TUTOR_CAPABILITIES } from "../capabilities/learning/tutorRunner";
import { AI_CAPABILITY_CATALOG as PRIVATE_DOMAINS } from "../../privateAi/capabilities";
import {
  buildBuiltinCapabilityCatalogEntries,
  createCapabilityCatalogRegistry,
  getCapabilityCatalogRegistry,
  listExecutableSharedCapabilityIds,
  resetCapabilityCatalogRegistryForTests,
  validateCapabilityEntry,
  versionsCompatible,
} from "./index";

afterEach(() => {
  resetCapabilityCatalogRegistryForTests();
});

describe("AI Capability Catalog & Service Registry V1", () => {
  it("registers builtin catalog without duplicate ids", () => {
    const entries = buildBuiltinCapabilityCatalogEntries();
    const ids = entries.map((e) => e.capabilityId);
    expect(new Set(ids).size).toBe(ids.length);
    const registry = createCapabilityCatalogRegistry(entries);
    expect(registry.list().length).toBe(entries.length);
  });

  it("looks up shared and private domain capabilities", () => {
    const registry = getCapabilityCatalogRegistry();
    expect(registry.lookup("commerce.product_draft_assistant")?.executable).toBe(
      true
    );
    expect(registry.lookup("platform.translation_suggest")?.category).toBe(
      "translation"
    );
    expect(
      registry.lookup("private_ai.domain.reasoning")?.executionSurface
    ).toBe("private_ai_routing");
  });

  it("rejects duplicate registration", () => {
    const registry = createCapabilityCatalogRegistry();
    const entry = registry.lookup("assistant.runtime_turn")!;
    expect(() => registry.register({ ...entry })).toThrow(
      /duplicate_capability_id|Duplicate/i
    );
  });

  it("negotiates versions", () => {
    const registry = createCapabilityCatalogRegistry();
    expect(
      registry.negotiateVersion("commerce.product_draft_assistant", "1.0.0").ok
    ).toBe(true);
    expect(
      registry.negotiateVersion("commerce.product_draft_assistant", "2.0.0").ok
    ).toBe(false);
    expect(versionsCompatible("1.2.0", "1.2")).toBe(true);
    expect(versionsCompatible("1.2.0", "1.3")).toBe(false);
  });

  it("enforces lifecycle transitions", () => {
    const registry = createCapabilityCatalogRegistry();
    const next = registry.advanceLifecycle(
      "assistant.runtime_turn",
      "deprecated"
    );
    expect(next.lifecycle).toBe("deprecated");
    expect(() =>
      registry.advanceLifecycle("assistant.runtime_turn", "draft")
    ).toThrow(/Invalid capability lifecycle/);
  });

  it("filters by category, provider, runtime, permission", () => {
    const registry = createCapabilityCatalogRegistry();
    const learning = registry.filter({ category: "learning" });
    expect(learning.length).toBe(LEARNING_TUTOR_CAPABILITIES.length);
    expect(
      registry.filter({
        providerId: "gemini",
        executableOnly: true,
      }).length
    ).toBeGreaterThan(0);
    expect(
      registry.filter({
        runtimeKind: "private_ai_runtime",
        includeDeprecated: true,
      }).every((e) => e.executionSurface === "private_ai_routing")
    ).toBe(true);
    expect(
      registry.filter({ permission: "platform_admin" }).length
    ).toBeGreaterThan(0);
  });

  it("checks compatibility and permissions", () => {
    const registry = createCapabilityCatalogRegistry();
    const ok = registry.checkCompatibility("platform.diagnostics_probe", {
      requireExecutable: true,
      requirePermission: "platform_admin",
      providerId: "openai",
    });
    expect(ok.ok).toBe(true);
    const bad = registry.checkCompatibility("creator.assist_coming_soon", {
      requireExecutable: true,
    });
    expect(bad.ok).toBe(false);
  });

  it("covers real learning + private domain categories without inventing products", () => {
    const registry = createCapabilityCatalogRegistry();
    for (const id of LEARNING_TUTOR_CAPABILITIES) {
      expect(registry.lookup(id)?.category).toBe("learning");
    }
    for (const d of PRIVATE_DOMAINS) {
      expect(registry.lookup(`private_ai.domain.${d.id}`)?.privateAiDomainId).toBe(
        d.id
      );
    }
    const executable = listExecutableSharedCapabilityIds();
    expect(executable).toContain("commerce.product_draft_assistant");
    expect(executable).not.toContain("creator.assist_coming_soon");
    expect(executable).not.toContain("private_ai.domain.translation");
  });

  it("validates missing contracts and invalid providers/runtimes", () => {
    const base = getCapabilityCatalogRegistry().lookup(
      "commerce.product_draft_assistant"
    )!;
    const bad = validateCapabilityEntry(
      {
        ...base,
        capabilityId: "test.invalid",
        supportedProviders: ["not-a-provider"],
        supportedRuntimes: ["not-a-runtime"],
        documentation: { ...base.documentation, sourceModule: "" },
      },
      new Set()
    );
    expect(bad.ok).toBe(false);
    expect(bad.errors).toContain("invalid_provider_not-a-provider");
    expect(bad.errors).toContain("invalid_runtime_not-a-runtime");
    expect(bad.errors).toContain("missing_documentation_source");
  });

  it("requireExecutable fail-closes for hub placeholders", () => {
    const registry = createCapabilityCatalogRegistry();
    expect(() =>
      registry.requireExecutable("creator.assist_coming_soon")
    ).toThrow(/not executable/);
    expect(
      registry.requireExecutable("platform.translation_suggest").capabilityId
    ).toBe("platform.translation_suggest");
  });
});
