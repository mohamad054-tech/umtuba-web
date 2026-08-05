import { afterEach, describe, expect, it } from "vitest";
import {
  assertRoutingContractShape,
  buildDefaultRoutingContracts,
  canTransitionPrivateAiLifecycle,
  createPrivateAiPermission,
  createPrivateAiService,
  getDeploymentProfile,
  getHardwareContract,
  hasPermission,
  listDeploymentProfiles,
  listHardwareContracts,
  resetPrivateAiForTests,
} from "./index";

afterEach(() => {
  resetPrivateAiForTests();
});

describe("Private AI Foundation", () => {
  it("registers private/external/local/experimental models", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const privateModel = svc.registerModel({
      id: "pam_test_private",
      name: "Test Private",
      modelClass: "private",
      family: "specialized",
      version: "0.1.0",
      capabilities: ["translation"],
    });
    expect(privateModel.lifecycle).toBe("draft");
    expect(svc.listModels()).toHaveLength(1);

    svc.registerModel({
      id: "pam_test_local",
      name: "Test Local",
      modelClass: "local",
      family: "embedding",
      version: "0.0.1",
      capabilities: ["retrieval"],
    });
    expect(svc.listModels()).toHaveLength(2);
    expect(() =>
      svc.registerModel({
        id: "pam_bad",
        name: "Bad",
        modelClass: "archived",
        family: "foundation",
        version: "1",
      })
    ).toThrow(/archived/);
  });

  it("registers capabilities and maps models", () => {
    const svc = createPrivateAiService({ ephemeral: true });
    expect(svc.listCapabilities()).toHaveLength(12);
    const model = svc.getModel("pam_umtuba_translator_private")!;
    svc.mapCapabilityToModel({
      capabilityId: "moderation",
      modelId: model.id,
    });
    expect(svc.getModel(model.id)?.capabilities).toContain("moderation");
    expect(
      svc.listCapabilities().find((c) => c.id === "moderation")?.mappedModelIds
    ).toContain(model.id);
  });

  it("enforces lifecycle transitions without training", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    const model = svc.registerModel({
      id: "pam_life",
      name: "Lifecycle",
      modelClass: "experimental",
      family: "adapter",
      version: "0.0.1",
    });
    expect(canTransitionPrivateAiLifecycle("draft", "production")).toBe(false);
    const planned = svc.advanceLifecycle({
      modelId: model.id,
      to: "training_planned",
    });
    expect(planned.lifecycle).toBe("training_planned");
    expect(() =>
      svc.advanceLifecycle({ modelId: model.id, to: "production" })
    ).toThrow(/Invalid private AI lifecycle/);
    const archived = svc.advanceLifecycle({
      modelId: model.id,
      to: "archived",
    });
    expect(archived.modelClass).toBe("archived");
  });

  it("validates routing and deployment contracts", () => {
    const routes = buildDefaultRoutingContracts();
    expect(routes.length).toBe(12);
    for (const r of routes) {
      expect(assertRoutingContractShape(r)).toEqual([]);
    }
    expect(
      assertRoutingContractShape({ ...routes[0]!, primary: "fallback" })
    ).toContain("primary_cannot_be_fallback");
    expect(listDeploymentProfiles()).toHaveLength(6);
    expect(getDeploymentProfile("air_gapped")?.requiresAirGap).toBe(true);
    expect(getDeploymentProfile("offline")?.allowsExternalProviders).toBe(
      false
    );
  });

  it("exposes hardware contracts without provisioning", () => {
    expect(listHardwareContracts().length).toBeGreaterThanOrEqual(3);
    expect(getHardwareContract("hw_gpu_internal")?.gpuRequired).toBe(true);
    expect(getHardwareContract("hw_airgap_secure")?.containerProfile).toContain(
      "airgap"
    );
  });

  it("enforces permission contracts", () => {
    const svc = createPrivateAiService({ ephemeral: true });
    expect(
      svc.checkPermission({
        scope: "model",
        resourceId: "*",
        role: "platform_admin",
        action: "read",
      })
    ).toBe(true);
    expect(
      svc.checkPermission({
        scope: "model",
        resourceId: "*",
        role: "guest",
        action: "read",
      })
    ).toBe(false);

    const denied = createPrivateAiPermission({
      id: "p1",
      scope: "experiment",
      resourceId: "x",
      role: "analyst",
      actions: ["read"],
      granted: false,
    });
    expect(
      hasPermission([denied], {
        scope: "experiment",
        resourceId: "x",
        role: "analyst",
        action: "read",
      })
    ).toBe(false);
  });
});
