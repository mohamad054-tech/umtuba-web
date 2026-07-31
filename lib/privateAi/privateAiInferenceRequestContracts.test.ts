import { afterEach, describe, expect, it } from "vitest";
import {
  canTransitionInferenceRequest,
  createPrivateAiPermission,
  createPrivateAiService,
  resetPrivateAiForTests,
  validateInferenceRequestContract,
} from "./index";

afterEach(() => {
  resetPrivateAiForTests();
});

const requester = {
  actorId: "user_1",
  role: "platform_admin",
  tenantId: "tenant_umtuba",
  sessionId: "sess_1",
};

describe("Private AI Inference Request Contracts V1", () => {
  it("validates a well-formed request and advances lifecycle", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const created = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "Summarize platform status",
      requester,
      streaming: { enabled: false },
      structuredOutput: { mode: "json", validateOutput: true },
    });
    expect(created.lifecycle).toBe("pending");
    expect(created.runtimeId).toBe("prt_external_general_primary");
    expect(created.auditEntryId).toBeTruthy();

    const validated = svc.validateInferenceRequest(created.requestId);
    expect(validated.lifecycle).toBe("validated");
    expect(validated.validationErrors).toEqual([]);

    const accepted = svc.advanceInferenceRequest({
      requestId: created.requestId,
      to: "accepted",
    });
    expect(accepted.lifecycle).toBe("accepted");
    const queued = svc.advanceInferenceRequest({
      requestId: created.requestId,
      to: "queued",
    });
    expect(queued.lifecycle).toBe("queued");
    const running = svc.advanceInferenceRequest({
      requestId: created.requestId,
      to: "running",
    });
    expect(running.lifecycle).toBe("running");
    const completed = svc.advanceInferenceRequest({
      requestId: created.requestId,
      to: "completed",
    });
    expect(completed.lifecycle).toBe("completed");
    expect(completed.metrics.latencyMs).not.toBeNull();
  });

  it("rejects empty payload and missing permission fail-closed", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const empty = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "   ",
      inputKind: "empty",
      requester,
    });
    const rejected = svc.validateInferenceRequest(empty.requestId);
    expect(rejected.lifecycle).toBe("rejected");
    expect(rejected.validationErrors).toContain("payload_empty");
    expect(rejected.metrics.failureClass).toBe("validation");

    Object.assign(svc.getState(), {
      permissions: [
        createPrivateAiPermission({
          id: "perm_ro",
          scope: "model",
          resourceId: "*",
          role: "platform_admin",
          actions: ["read"],
          granted: true,
        }),
      ],
    });
    expect(() =>
      svc.createInferenceRequest({
        capabilityId: "reasoning",
        prompt: "hello",
        requester,
      })
    ).toThrow(/Permission denied/);
  });

  it("blocks ineligible runtime / provider / model lifecycle", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "translation",
      prompt: "translate",
      runtimeId: "prt_translator_pending",
      modelId: "pam_umtuba_translator_private",
      providerId: "umtuba-private",
      requester,
      autoSelectRuntime: false,
    });
    const result = validateInferenceRequestContract(req, svc.getState());
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("runtime_deployment_"))).toBe(
      true
    );
    expect(result.errors).toContain("model_lifecycle_draft");
  });

  it("supports structured output and streaming metadata contracts", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "return json",
      requester,
      structuredOutput: {
        mode: "schema",
        schemaId: "schema_status_v1",
        schemaVersion: "1",
        validateOutput: true,
      },
      streaming: {
        enabled: true,
        streamId: "stream_demo",
        chunkSequenceStart: 0,
        completionMarker: "[DONE]",
        cancellationSupported: true,
        backpressureHint: "buffer_limit",
        maxBufferedChunks: 32,
      },
    });
    expect(req.structuredOutput.mode).toBe("schema");
    expect(req.streaming.enabled).toBe(true);
    expect(req.streaming.streamId).toBe("stream_demo");
    const validated = svc.validateInferenceRequest(req.requestId);
    expect(validated.lifecycle).toBe("validated");
  });

  it("cancels running requests and records cancellation metrics", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "long job",
      requester,
      streaming: { enabled: true, cancellationSupported: true },
    });
    svc.validateInferenceRequest(req.requestId);
    svc.advanceInferenceRequest({ requestId: req.requestId, to: "accepted" });
    svc.advanceInferenceRequest({ requestId: req.requestId, to: "running" });
    const cancelled = svc.cancelInferenceRequest({
      requestId: req.requestId,
      reason: "user_abort",
    });
    expect(cancelled.lifecycle).toBe("cancelled");
    expect(cancelled.cancellationRequested).toBe(true);
    expect(cancelled.metrics.failureClass).toBe("cancelled");
  });

  it("applies timeout and retry metadata without executing models", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "slow",
      requester,
      timeoutMs: 1000,
      maxAttempts: 3,
      retryDelayMs: 250,
      now: "2026-07-31T16:00:00.000Z",
    });
    svc.validateInferenceRequest(req.requestId, "2026-07-31T16:00:00.000Z");
    svc.advanceInferenceRequest({
      requestId: req.requestId,
      to: "accepted",
      now: "2026-07-31T16:00:00.000Z",
    });
    svc.advanceInferenceRequest({
      requestId: req.requestId,
      to: "running",
      now: "2026-07-31T16:00:00.000Z",
    });
    const timed = svc.timeoutInferenceRequest({
      requestId: req.requestId,
      now: "2026-07-31T16:00:02.000Z",
    });
    expect(timed.lifecycle).toBe("timed_out");
    expect(timed.metrics.failureClass).toBe("timeout");

    const retried = svc.retryInferenceRequest({
      requestId: req.requestId,
      now: "2026-07-31T16:00:03.000Z",
    });
    expect(retried.lifecycle).toBe("queued");
    expect(retried.retry.attempt).toBe(2);
    expect(retried.retry.lastRetryAt).toBe("2026-07-31T16:00:03.000Z");
  });

  it("rejects illegal lifecycle transitions", () => {
    expect(canTransitionInferenceRequest("pending", "running")).toBe(false);
    expect(canTransitionInferenceRequest("running", "completed")).toBe(true);
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "x",
      requester,
    });
    expect(() =>
      svc.advanceInferenceRequest({
        requestId: req.requestId,
        to: "completed",
      })
    ).toThrow(/Invalid inference request transition/);
  });

  it("links audit entry and exposes admin list models", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "tool_use",
      prompt: "list tools",
      requester,
    });
    expect(req.auditEntryId).toBeTruthy();
    expect(
      svc.getState().auditTrail.some((a) => a.id === req.auditEntryId)
    ).toBe(true);
    expect(svc.listInferenceRequests().some((r) => r.requestId === req.requestId)).toBe(
      true
    );
    expect(svc.getInferenceRequest(req.requestId)?.capabilityId).toBe("tool_use");
  });
});
