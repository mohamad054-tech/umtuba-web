import { afterEach, describe, expect, it } from "vitest";
import {
  PRIVATE_AI_LIFECYCLE_ORDER,
  canTransitionPrivateAiLifecycle,
  createPrivateAiService,
  evaluatePrivateAiReadiness,
  listAllowedPrivateAiTransitions,
  resetPrivateAiForTests,
  type PrivateAiLifecycle,
} from "./index";

afterEach(() => {
  resetPrivateAiForTests();
});

function registerReadyModel(
  svc: ReturnType<typeof createPrivateAiService>,
  id = "pam_ready"
) {
  return svc.registerModel({
    id,
    name: "Ready Model",
    modelClass: "private",
    family: "specialized",
    version: "1.0.0",
    capabilities: ["translation"],
    deploymentProfileIds: ["development"],
    hardwareContractId: "hw_gpu_internal",
    routingContractIds: ["route_translation_v1"],
    architecture: "registry-placeholder",
    actorRole: "platform_admin",
  });
}

describe("Private AI Workflow & Lifecycle V1", () => {
  it("defines the full admin lifecycle order", () => {
    expect(PRIVATE_AI_LIFECYCLE_ORDER).toEqual([
      "draft",
      "submitted_for_review",
      "changes_requested",
      "rejected",
      "approved",
      "active",
      "deprecated",
      "retired",
    ]);
  });

  it("allows all legal transitions and rejects illegal ones", () => {
    const legal: Array<[PrivateAiLifecycle, PrivateAiLifecycle]> = [
      ["draft", "submitted_for_review"],
      ["draft", "retired"],
      ["submitted_for_review", "changes_requested"],
      ["submitted_for_review", "rejected"],
      ["submitted_for_review", "approved"],
      ["changes_requested", "draft"],
      ["changes_requested", "submitted_for_review"],
      ["rejected", "draft"],
      ["rejected", "retired"],
      ["approved", "active"],
      ["approved", "deprecated"],
      ["approved", "retired"],
      ["active", "deprecated"],
      ["active", "retired"],
      ["deprecated", "active"],
      ["deprecated", "retired"],
    ];
    for (const [from, to] of legal) {
      expect(canTransitionPrivateAiLifecycle(from, to)).toBe(true);
    }

    const illegal: Array<[PrivateAiLifecycle, PrivateAiLifecycle]> = [
      ["draft", "approved"],
      ["draft", "active"],
      ["submitted_for_review", "active"],
      ["changes_requested", "approved"],
      ["rejected", "approved"],
      ["approved", "submitted_for_review"],
      ["active", "draft"],
      ["retired", "draft"],
      ["retired", "active"],
      ["deprecated", "draft"],
    ];
    for (const [from, to] of illegal) {
      expect(canTransitionPrivateAiLifecycle(from, to)).toBe(false);
    }

    expect(listAllowedPrivateAiTransitions("retired")).toEqual([]);
  });

  it("walks the happy path draft → … → active → deprecated → retired", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const model = registerReadyModel(svc);

    const steps: PrivateAiLifecycle[] = [
      "submitted_for_review",
      "approved",
      "active",
      "deprecated",
      "retired",
    ];
    let current = model;
    for (const to of steps) {
      current = svc.advanceLifecycle({
        modelId: current.id,
        to,
        actorId: "admin-1",
        actorRole: "platform_admin",
      });
      expect(current.lifecycle).toBe(to);
    }
    expect(current.modelClass).toBe("archived");
    expect(svc.listAuditTrail().length).toBeGreaterThanOrEqual(6);
  });

  it("supports changes_requested and reject loops with required reasons", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const model = registerReadyModel(svc, "pam_review");

    svc.advanceLifecycle({
      modelId: model.id,
      to: "submitted_for_review",
      actorRole: "platform_admin",
    });

    expect(() =>
      svc.advanceLifecycle({
        modelId: model.id,
        to: "changes_requested",
        actorRole: "platform_admin",
      })
    ).toThrow(/Reason required/);

    const changed = svc.advanceLifecycle({
      modelId: model.id,
      to: "changes_requested",
      actorRole: "model_reviewer",
      reason: "Add hardware notes",
    });
    expect(changed.reviewReason).toBe("Add hardware notes");

    svc.advanceLifecycle({
      modelId: model.id,
      to: "submitted_for_review",
      actorRole: "platform_admin",
    });

    const rejected = svc.advanceLifecycle({
      modelId: model.id,
      to: "rejected",
      actorRole: "model_reviewer",
      reason: "Out of scope",
    });
    expect(rejected.lifecycle).toBe("rejected");
    expect(rejected.reviewReason).toBe("Out of scope");

    const back = svc.advanceLifecycle({
      modelId: model.id,
      to: "draft",
      actorRole: "platform_admin",
    });
    expect(back.lifecycle).toBe("draft");
  });

  it("enforces readiness gate on approve and activate", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const incomplete = svc.registerModel({
      id: "pam_incomplete",
      name: "Incomplete",
      modelClass: "private",
      family: "specialized",
      version: "0.1.0",
      // no capabilities / routing / hardware
      actorRole: "platform_admin",
    });

    const gate = evaluatePrivateAiReadiness(incomplete, svc.getState());
    expect(gate.ready).toBe(false);
    expect(gate.blockers).toEqual(
      expect.arrayContaining([
        "capability_required",
        "routing_contract_required",
        "hardware_contract_required",
      ])
    );

    svc.advanceLifecycle({
      modelId: incomplete.id,
      to: "submitted_for_review",
      actorRole: "platform_admin",
    });

    expect(() =>
      svc.advanceLifecycle({
        modelId: incomplete.id,
        to: "approved",
        actorRole: "platform_admin",
      })
    ).toThrow(/Readiness gate blocked approved/);

    const ready = registerReadyModel(svc, "pam_ready_activate");
    svc.advanceLifecycle({
      modelId: ready.id,
      to: "submitted_for_review",
      actorRole: "platform_admin",
    });
    const approved = svc.advanceLifecycle({
      modelId: ready.id,
      to: "approved",
      actorRole: "platform_admin",
    });
    expect(approved.lifecycle).toBe("approved");

    // Strip routing to simulate post-approval corruption edge case
    const state = svc.getState();
    const corrupted = {
      ...approved,
      routingContractIds: [] as string[],
    };
    // Re-evaluate readiness directly
    expect(evaluatePrivateAiReadiness(corrupted, state).ready).toBe(false);
  });

  it("enforces permissions for workflow actions", () => {
    const svc = createPrivateAiService({ ephemeral: true });
    const model = svc.getModel("pam_umtuba_translator_private")!;

    expect(() =>
      svc.advanceLifecycle({
        modelId: model.id,
        to: "submitted_for_review",
        actorRole: "guest",
      })
    ).toThrow(/Permission denied/);

    // Reviewer can approve after submit, but cannot activate
    const ready = registerReadyModel(svc, "pam_perm");
    svc.advanceLifecycle({
      modelId: ready.id,
      to: "submitted_for_review",
      actorRole: "platform_admin",
    });
    const approved = svc.advanceLifecycle({
      modelId: ready.id,
      to: "approved",
      actorRole: "model_reviewer",
    });
    expect(approved.lifecycle).toBe("approved");

    expect(() =>
      svc.advanceLifecycle({
        modelId: ready.id,
        to: "active",
        actorRole: "model_reviewer",
      })
    ).toThrow(/Permission denied/);

    const active = svc.advanceLifecycle({
      modelId: ready.id,
      to: "active",
      actorRole: "platform_admin",
      actorId: "ops-1",
    });
    expect(active.lifecycle).toBe("active");
  });

  it("writes an audit trail entry for every state change", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const model = registerReadyModel(svc, "pam_audit");
    const before = svc.listAuditTrail().length;

    svc.advanceLifecycle({
      modelId: model.id,
      to: "submitted_for_review",
      actorId: "a1",
      actorRole: "platform_admin",
      reason: "ready for review",
    });
    svc.advanceLifecycle({
      modelId: model.id,
      to: "approved",
      actorId: "a2",
      actorRole: "platform_admin",
    });

    const trail = svc.listAuditTrail();
    expect(trail.length).toBe(before + 2);
    const last = trail[trail.length - 1]!;
    expect(last.previousState).toBe("submitted_for_review");
    expect(last.newState).toBe("approved");
    expect(last.action).toBe("approve");
    expect(last.modelId).toBe(model.id);
    expect(last.actorId).toBe("a2");
  });

  it("handles edge cases: unknown model, noop same-state, terminal retired", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    expect(() => svc.evaluateReadiness("missing")).toThrow(/Unknown model/);
    expect(() =>
      svc.advanceLifecycle({
        modelId: "missing",
        to: "draft",
        actorRole: "platform_admin",
      })
    ).toThrow(/Unknown model/);

    const model = registerReadyModel(svc, "pam_edge");
    const same = svc.advanceLifecycle({
      modelId: model.id,
      to: "draft",
      actorRole: "platform_admin",
    });
    expect(same.lifecycle).toBe("draft");

    svc.advanceLifecycle({
      modelId: model.id,
      to: "retired",
      actorRole: "platform_admin",
    });
    expect(() =>
      svc.advanceLifecycle({
        modelId: model.id,
        to: "draft",
        actorRole: "platform_admin",
      })
    ).toThrow(/Invalid private AI lifecycle/);
  });

  it("allows external models without hardware contract through readiness", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const external = svc.registerModel({
      id: "pam_ext",
      name: "External",
      modelClass: "external",
      family: "foundation",
      version: "1",
      capabilities: ["reasoning"],
      deploymentProfileIds: ["development"],
      hardwareContractId: null,
      routingContractIds: ["route_reasoning_v1"],
      architecture: "provider-api-contract",
    });
    expect(svc.evaluateReadiness(external.id).ready).toBe(true);
  });
});
