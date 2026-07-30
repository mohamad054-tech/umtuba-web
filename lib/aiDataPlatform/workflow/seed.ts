/**
 * Workflow seed — wires foundation approved dataset into approval workflow.
 * No training / inference.
 */

import type { AiDataPlatformService } from "../service";
import { createAuditTrailEntry } from "./audit";
import { emptyChecks } from "./validation";
import type { PersistedAiDataWorkflowState } from "./types";

export function buildAiDataWorkflowSeedState(
  platform: AiDataPlatformService,
  now = new Date().toISOString()
): PersistedAiDataWorkflowState {
  const approved = platform.getDataset("ads_internal_translation_v1");
  const draftBlocked = platform.getDataset("ads_unknown_blocked");
  const version = platform.getVersion("adv_internal_translation_1_0_0");

  const pass = {
    ok: true as const,
    blockers: [] as string[],
    warnings: [] as string[],
    checkedAt: now,
  };

  const datasets = [];
  if (approved) {
    datasets.push({
      datasetId: approved.id,
      approvalState: "approved" as const,
      checks: {
        validated: pass,
        quality: pass,
        rights: pass,
        privacy: pass,
        eligibility: pass,
      },
      rejectionReason: null,
      cloneOfDatasetId: null,
      updatedAt: now,
    });
  }
  if (draftBlocked) {
    datasets.push({
      datasetId: draftBlocked.id,
      approvalState: "draft" as const,
      checks: emptyChecks(),
      rejectionReason: null,
      cloneOfDatasetId: null,
      updatedAt: now,
    });
  }

  const versions = version
    ? [
        {
          versionId: version.id,
          datasetId: version.datasetId,
          lifecycle: "approved" as const,
          diffSummary: "Seed approved version from foundation.",
          changeHistory: [version.changes],
          approvalHistory: [
            {
              id: "vae_seed_approve",
              action: "approve",
              actorId: "system_seed",
              reason: "Foundation seed",
              fromState: "draft" as const,
              toState: "approved" as const,
              createdAt: now,
            },
          ],
          rollbackCandidate: false,
          updatedAt: now,
        },
      ]
    : [];

  return {
    schemaVersion: 1,
    updatedAt: now,
    datasets,
    versions,
    experimentCandidates: [],
    modelCandidates: [],
    auditTrail: [
      createAuditTrailEntry({
        action: "create",
        actorId: "system_seed",
        previousState: null,
        newState: "approved",
        datasetId: approved?.id ?? null,
        reason: "Seed workflow from foundation",
        now,
      }),
    ],
  };
}
