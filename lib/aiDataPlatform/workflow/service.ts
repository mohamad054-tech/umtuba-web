/**
 * AI Data Platform Workflow service — governed dataset lifecycle.
 * No training, fine-tuning, inference, or benchmark execution.
 */

import { detectPrivacyFindings } from "../../knowledgeAcquisition/privacyLayer";
import type { PrivacyReport } from "../../knowledgeAcquisition/types";
import {
  createAiDataPlatformService,
  type AiDataPlatformService,
} from "../service";
import type { AiDatasetRecord, ModelRecord } from "../types";
import { assertTransitionApproval } from "./approvalWorkflow";
import { createAuditTrailEntry } from "./audit";
import {
  emptyAiDataWorkflowState,
  readPersistedAiDataWorkflowState,
  resolveAiDataWorkflowDataDir,
  writePersistedAiDataWorkflowState,
} from "./fileStore";
import type {
  DatasetApprovalState,
  DatasetVersionWorkflowRecord,
  DatasetWorkflowRecord,
  ExperimentCandidateRecord,
  ModelCandidateRecord,
  PersistedAiDataWorkflowState,
  ValidationCheckResult,
  WorkflowDashboardSnapshot,
} from "./types";
import {
  emptyChecks,
  validateDatasetPrivacy,
  validateDatasetQualityForApproval,
  validateDatasetRights,
} from "./validation";
import { buildAiDataWorkflowSeedState } from "./seed";

function ensureWorkflow(
  state: PersistedAiDataWorkflowState,
  dataset: AiDatasetRecord,
  now: string
): DatasetWorkflowRecord {
  const existing = state.datasets.find((d) => d.datasetId === dataset.id);
  if (existing) return existing;
  return {
    datasetId: dataset.id,
    approvalState: dataset.status === "approved" ? "approved" : "draft",
    checks: emptyChecks(),
    rejectionReason: null,
    cloneOfDatasetId: null,
    updatedAt: now,
  };
}

export type AiDataWorkflowService = {
  getState(): PersistedAiDataWorkflowState;
  getPlatform(): AiDataPlatformService;
  listAuditTrail(): PersistedAiDataWorkflowState["auditTrail"];
  getDatasetWorkflow(datasetId: string): DatasetWorkflowRecord | null;
  listExperimentCandidates(): ExperimentCandidateRecord[];
  listModelCandidates(): ModelCandidateRecord[];
  dashboard(): WorkflowDashboardSnapshot;
  runValidate(input: {
    datasetId: string;
    actorId?: string | null;
    now?: string;
  }): ValidationCheckResult;
  runQualityCheck(input: {
    datasetId: string;
    actorId?: string | null;
    contentPreview?: string;
    now?: string;
  }): ValidationCheckResult;
  runRightsCheck(input: {
    datasetId: string;
    unapprovedAssetIds?: string[];
    actorId?: string | null;
    now?: string;
  }): ValidationCheckResult;
  runPrivacyCheck(input: {
    datasetId: string;
    contentPreview?: string;
    actorId?: string | null;
    now?: string;
  }): ValidationCheckResult;
  runEligibilityCheck(input: {
    datasetId: string;
    actorId?: string | null;
    now?: string;
  }): ValidationCheckResult;
  submitForReview(input: {
    datasetId: string;
    actorId?: string | null;
    reason?: string | null;
    now?: string;
  }): DatasetWorkflowRecord;
  requestChanges(input: {
    datasetId: string;
    actorId?: string | null;
    reason: string;
    now?: string;
  }): DatasetWorkflowRecord;
  approveDataset(input: {
    datasetId: string;
    actorId?: string | null;
    reason?: string | null;
    now?: string;
  }): DatasetWorkflowRecord;
  rejectDataset(input: {
    datasetId: string;
    actorId?: string | null;
    reason: string;
    now?: string;
  }): DatasetWorkflowRecord;
  archiveDataset(input: {
    datasetId: string;
    actorId?: string | null;
    reason?: string | null;
    now?: string;
  }): DatasetWorkflowRecord;
  cloneDataset(input: {
    sourceDatasetId: string;
    newDatasetId: string;
    newVersionId: string;
    actorId?: string | null;
    now?: string;
  }): { dataset: AiDatasetRecord; workflow: DatasetWorkflowRecord };
  createVersionWithWorkflow(input: {
    id: string;
    datasetId: string;
    version: string;
    parentVersion?: string | null;
    diffSummary: string;
    changes: string;
    actorId?: string | null;
    now?: string;
  }): DatasetVersionWorkflowRecord;
  createExperimentCandidate(input: {
    id: string;
    candidateDatasetId: string;
    candidateDatasetVersionId: string;
    candidateModelId?: string | null;
    evaluationSetId?: string | null;
    expectedMetrics?: Record<string, number>;
    owner?: string | null;
    notes?: string;
    actorId?: string | null;
    now?: string;
  }): ExperimentCandidateRecord;
  createModelCandidate(input: {
    id: string;
    model: {
      id: string;
      family: string;
      version: string;
      provider: string;
      architecture: string;
      capabilities?: string[];
    };
    datasetVersionId: string;
    evaluationSetId?: string | null;
    rollbackTargetId?: string | null;
    notes?: string;
    actorId?: string | null;
    now?: string;
  }): { model: ModelRecord; candidate: ModelCandidateRecord };
  persist(): void;
};

export function createAiDataWorkflowService(options?: {
  dataDir?: string;
  ephemeral?: boolean;
  seed?: boolean;
  platform?: AiDataPlatformService;
}): AiDataWorkflowService {
  const dataDir = resolveAiDataWorkflowDataDir(options?.dataDir);
  const platform =
    options?.platform ??
    createAiDataPlatformService({
      dataDir,
      ephemeral: options?.ephemeral,
      seed: options?.seed,
    });

  const now0 = new Date().toISOString();
  let state: PersistedAiDataWorkflowState = options?.ephemeral
    ? options.seed === false
      ? emptyAiDataWorkflowState(now0)
      : buildAiDataWorkflowSeedState(platform, now0)
    : readPersistedAiDataWorkflowState(dataDir) ??
      (options?.seed === false
        ? emptyAiDataWorkflowState(now0)
        : buildAiDataWorkflowSeedState(platform, now0));

  const persist = () => {
    if (options?.ephemeral) return;
    writePersistedAiDataWorkflowState(dataDir, state);
  };

  const upsertDatasetWorkflow = (record: DatasetWorkflowRecord) => {
    const exists = state.datasets.some((d) => d.datasetId === record.datasetId);
    state = {
      ...state,
      datasets: exists
        ? state.datasets.map((d) =>
            d.datasetId === record.datasetId ? record : d
          )
        : [...state.datasets, record],
      updatedAt: record.updatedAt,
    };
  };

  const appendAudit = (
    entry: ReturnType<typeof createAuditTrailEntry>
  ) => {
    state = {
      ...state,
      auditTrail: [entry, ...state.auditTrail].slice(0, 1000),
      updatedAt: entry.timestamp,
    };
  };

  const requireDataset = (id: string): AiDatasetRecord => {
    const ds = platform.getDataset(id);
    if (!ds) throw new Error(`Unknown dataset: ${id}`);
    return ds;
  };

  const transition = (input: {
    datasetId: string;
    to: DatasetApprovalState;
    action: string;
    actorId?: string | null;
    reason?: string | null;
    now?: string;
    requireChecksForApprove?: boolean;
  }): DatasetWorkflowRecord => {
    const dataset = requireDataset(input.datasetId);
    const now = input.now ?? new Date().toISOString();
    let wf = ensureWorkflow(state, dataset, now);
    assertTransitionApproval(wf.approvalState, input.to);

    if (input.to === "approved") {
      const privacy: PrivacyReport = {
        findings: [],
        blocking: false,
        notes: "approval gate",
      };
      const qualityGate = validateDatasetQualityForApproval({
        quality: dataset.quality,
        privacy: wf.checks.privacy
          ? {
              findings: [],
              blocking: !wf.checks.privacy.ok,
              notes: "from workflow privacy check",
            }
          : privacy,
        rights: dataset.rights,
        eligibility: dataset.eligibility,
        languages: dataset.languages,
        domains: dataset.domains,
        description: dataset.description,
      });
      if (!qualityGate.ok) {
        throw new Error(
          `Cannot approve dataset: ${qualityGate.blockers.join(", ")}`
        );
      }
      for (const key of ["validated", "quality", "rights", "privacy", "eligibility"] as const) {
        const check = wf.checks[key];
        if (!check || !check.ok) {
          throw new Error(`Cannot approve: ${key} check missing or failed`);
        }
      }
    }

    const previous = wf.approvalState;
    wf = {
      ...wf,
      approvalState: input.to,
      rejectionReason:
        input.to === "rejected" ? (input.reason ?? null) : wf.rejectionReason,
      updatedAt: now,
    };
    upsertDatasetWorkflow(wf);
    appendAudit(
      createAuditTrailEntry({
        action: input.action,
        actorId: input.actorId,
        reason: input.reason,
        previousState: previous,
        newState: input.to,
        datasetId: input.datasetId,
        now,
      })
    );
    persist();
    return wf;
  };

  const patchCheck = (
    datasetId: string,
    key: keyof DatasetWorkflowRecord["checks"],
    check: ValidationCheckResult,
    action: string,
    actorId?: string | null,
    now?: string
  ): ValidationCheckResult => {
    const dataset = requireDataset(datasetId);
    const ts = now ?? new Date().toISOString();
    let wf = ensureWorkflow(state, dataset, ts);
    wf = {
      ...wf,
      checks: { ...wf.checks, [key]: check },
      updatedAt: ts,
    };
    upsertDatasetWorkflow(wf);
    appendAudit(
      createAuditTrailEntry({
        action,
        actorId,
        previousState: null,
        newState: check.ok ? "pass" : "fail",
        datasetId,
        detail: { blockers: check.blockers, warnings: check.warnings },
        now: ts,
      })
    );
    persist();
    return check;
  };

  const service: AiDataWorkflowService = {
    getState: () => state,
    getPlatform: () => platform,
    listAuditTrail: () => [...state.auditTrail],
    getDatasetWorkflow: (id) =>
      state.datasets.find((d) => d.datasetId === id) ?? null,
    listExperimentCandidates: () => [...state.experimentCandidates],
    listModelCandidates: () => [...state.modelCandidates],

    dashboard() {
      const byId = new Map(
        state.datasets.map((w) => [w.datasetId, w.approvalState])
      );
      const all = platform.listDatasets();
      const pick = (s: DatasetApprovalState) =>
        all.filter((d) => (byId.get(d.id) ?? (d.status === "approved" ? "approved" : "draft")) === s);
      return {
        draftDatasets: pick("draft"),
        reviewQueue: pick("review"),
        approvedDatasets: pick("approved"),
        rejectedDatasets: pick("rejected"),
        modelCandidates: [...state.modelCandidates],
        experimentCandidates: [...state.experimentCandidates],
        promotionQueueCount: platform.listPromotionQueue().length,
      };
    },

    runValidate(input) {
      const ds = requireDataset(input.datasetId);
      const blockers: string[] = [];
      if (!ds.name.trim()) blockers.push("name_missing");
      if (!ds.description.trim()) blockers.push("description_missing");
      if (ds.languages.length === 0) blockers.push("languages_missing");
      if (ds.domains.length === 0) blockers.push("domains_missing");
      const check = {
        ok: blockers.length === 0,
        blockers,
        warnings: [] as string[],
        checkedAt: input.now ?? new Date().toISOString(),
      };
      return patchCheck(
        input.datasetId,
        "validated",
        check,
        "validate",
        input.actorId,
        input.now
      );
    },

    runQualityCheck(input) {
      const ds = requireDataset(input.datasetId);
      const privacy = detectPrivacyFindings(
        input.contentPreview ?? ds.description
      );
      const check = validateDatasetQualityForApproval({
        quality: ds.quality,
        privacy,
        rights: ds.rights,
        eligibility: ds.eligibility,
        languages: ds.languages,
        domains: ds.domains,
        description: ds.description,
      });
      // quality check stores quality-focused result (privacy handled separately too)
      const qualityOnly = {
        ...check,
        blockers: check.blockers.filter(
          (b) => !b.startsWith("privacy_") && !b.startsWith("rights_") && b !== "eligibility_ineligible" && b !== "eligibility_invalid"
        ),
        ok: check.blockers.filter(
          (b) =>
            b.startsWith("quality_") ||
            b.startsWith("metadata_")
        ).length === 0 && ds.quality.blockingFindings.length === 0 && ds.quality.overallScore >= 0.7,
      };
      qualityOnly.ok = qualityOnly.blockers.length === 0;
      return patchCheck(
        input.datasetId,
        "quality",
        qualityOnly,
        "quality_check",
        input.actorId,
        input.now
      );
    },

    runRightsCheck(input) {
      const ds = requireDataset(input.datasetId);
      const check = validateDatasetRights({
        rights: ds.rights,
        eligibility: ds.eligibility,
        sourceAssetIds: ds.sourceAssetIds,
        unapprovedAssetIds: input.unapprovedAssetIds,
        now: input.now,
      });
      return patchCheck(
        input.datasetId,
        "rights",
        check,
        "rights_check",
        input.actorId,
        input.now
      );
    },

    runPrivacyCheck(input) {
      const ds = requireDataset(input.datasetId);
      const privacy = detectPrivacyFindings(
        input.contentPreview ?? ds.description
      );
      const check = validateDatasetPrivacy(privacy, input.now);
      return patchCheck(
        input.datasetId,
        "privacy",
        check,
        "privacy_check",
        input.actorId,
        input.now
      );
    },

    runEligibilityCheck(input) {
      const ds = requireDataset(input.datasetId);
      const blockers: string[] = [];
      if (ds.eligibility.includes("ineligible")) {
        blockers.push("eligibility_ineligible");
      }
      if (
        !ds.eligibility.includes("dataset_eligible") &&
        !ds.eligibility.includes("eligible_for_internal_reuse") &&
        !ds.eligibility.includes("eligible_for_training") &&
        !ds.eligibility.includes("eligible_for_model_customization")
      ) {
        blockers.push("eligibility_invalid");
      }
      const check = {
        ok: blockers.length === 0,
        blockers,
        warnings: [] as string[],
        checkedAt: input.now ?? new Date().toISOString(),
      };
      return patchCheck(
        input.datasetId,
        "eligibility",
        check,
        "eligibility_check",
        input.actorId,
        input.now
      );
    },

    submitForReview(input) {
      return transition({
        ...input,
        to: "review",
        action: "submit_review",
      });
    },

    requestChanges(input) {
      return transition({
        ...input,
        to: "needs_changes",
        action: "request_changes",
      });
    },

    approveDataset(input) {
      return transition({
        ...input,
        to: "approved",
        action: "approve",
        requireChecksForApprove: true,
      });
    },

    rejectDataset(input) {
      return transition({
        ...input,
        to: "rejected",
        action: "reject",
      });
    },

    archiveDataset(input) {
      return transition({
        ...input,
        to: "archived",
        action: "archive",
      });
    },

    cloneDataset(input) {
      const source = requireDataset(input.sourceDatasetId);
      const now = input.now ?? new Date().toISOString();
      const dataset = platform.registerDataset({
        id: input.newDatasetId,
        name: `${source.name} (clone)`,
        version: "0.1.0",
        description: source.description,
        owner: source.owner,
        kind: source.kind,
        status: "draft",
        sourceAssetIds: [...source.sourceAssetIds],
        knowledgeSourceIds: [...source.knowledgeSourceIds],
        translationSourceIds: [...source.translationSourceIds],
        learningSourceIds: [...source.learningSourceIds],
        codingSourceIds: [...source.codingSourceIds],
        commerceSourceIds: [...source.commerceSourceIds],
        languages: [...source.languages],
        domains: [...source.domains],
        rights: source.rights,
        eligibility: [...source.eligibility],
        sensitivity: source.sensitivity,
        sizeBytes: source.statistics.sizeBytes,
        now,
      });
      platform.createDatasetVersion({
        id: input.newVersionId,
        datasetId: dataset.id,
        version: "0.1.0",
        parentVersion: source.version,
        createdFrom: `clone:${source.id}`,
        changes: `Cloned from ${source.id}`,
        approved: false,
        now,
      });
      const workflow: DatasetWorkflowRecord = {
        datasetId: dataset.id,
        approvalState: "draft",
        checks: emptyChecks(),
        rejectionReason: null,
        cloneOfDatasetId: source.id,
        updatedAt: now,
      };
      upsertDatasetWorkflow(workflow);
      appendAudit(
        createAuditTrailEntry({
          action: "clone",
          actorId: input.actorId,
          previousState: null,
          newState: "draft",
          datasetId: dataset.id,
          detail: { cloneOf: source.id },
          now,
        })
      );
      persist();
      return { dataset, workflow };
    },

    createVersionWithWorkflow(input) {
      const now = input.now ?? new Date().toISOString();
      const version = platform.createDatasetVersion({
        id: input.id,
        datasetId: input.datasetId,
        version: input.version,
        parentVersion: input.parentVersion,
        createdFrom: "workflow",
        changes: input.changes,
        approved: false,
        now,
      });
      const record: DatasetVersionWorkflowRecord = {
        versionId: version.id,
        datasetId: input.datasetId,
        lifecycle: "draft",
        diffSummary: input.diffSummary,
        changeHistory: [input.changes],
        approvalHistory: [
          {
            id: `vae_${version.id}_create`,
            action: "create_version",
            actorId: input.actorId ?? null,
            reason: null,
            fromState: null,
            toState: "draft",
            createdAt: now,
          },
        ],
        rollbackCandidate: Boolean(input.parentVersion),
        updatedAt: now,
      };
      state = {
        ...state,
        versions: [...state.versions, record],
        updatedAt: now,
      };
      appendAudit(
        createAuditTrailEntry({
          action: "version",
          actorId: input.actorId,
          previousState: input.parentVersion,
          newState: input.version,
          datasetId: input.datasetId,
          versionId: version.id,
          detail: { diffSummary: input.diffSummary },
          now,
        })
      );
      persist();
      return record;
    },

    createExperimentCandidate(input) {
      const dataset = requireDataset(input.candidateDatasetId);
      const version = platform.getVersion(input.candidateDatasetVersionId);
      if (!version) {
        throw new Error(
          `Unknown dataset version: ${input.candidateDatasetVersionId}`
        );
      }
      const wf =
        state.datasets.find((d) => d.datasetId === dataset.id) ??
        ensureWorkflow(state, dataset, input.now ?? new Date().toISOString());
      if (wf.approvalState !== "approved") {
        throw new Error(
          "Experiment candidate requires approved dataset workflow"
        );
      }
      if (state.experimentCandidates.some((e) => e.id === input.id)) {
        throw new Error(`Experiment candidate exists: ${input.id}`);
      }
      const now = input.now ?? new Date().toISOString();
      const record: ExperimentCandidateRecord = {
        id: input.id,
        candidateDatasetId: input.candidateDatasetId,
        candidateDatasetVersionId: input.candidateDatasetVersionId,
        candidateModelId: input.candidateModelId ?? null,
        evaluationSetId: input.evaluationSetId ?? null,
        expectedMetrics: input.expectedMetrics ?? {},
        owner: input.owner ?? null,
        status: "candidate",
        artifactRefs: [],
        notes: input.notes ?? "Contract only — no training execution.",
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        experimentCandidates: [...state.experimentCandidates, record],
        updatedAt: now,
      };
      appendAudit(
        createAuditTrailEntry({
          action: "create_experiment_candidate",
          actorId: input.actorId,
          datasetId: input.candidateDatasetId,
          versionId: input.candidateDatasetVersionId,
          newState: "candidate",
          now,
        })
      );
      persist();
      return record;
    },

    createModelCandidate(input) {
      const version = platform.getVersion(input.datasetVersionId);
      if (!version) {
        throw new Error(`Unknown dataset version: ${input.datasetVersionId}`);
      }
      const dataset = requireDataset(version.datasetId);
      const wf =
        state.datasets.find((d) => d.datasetId === dataset.id) ??
        ensureWorkflow(state, dataset, input.now ?? new Date().toISOString());
      if (wf.approvalState !== "approved") {
        throw new Error("Model candidate requires approved dataset");
      }
      const now = input.now ?? new Date().toISOString();
      const model = platform.registerModel({
        id: input.model.id,
        family: input.model.family,
        version: input.model.version,
        provider: input.model.provider,
        architecture: input.model.architecture,
        capabilities: input.model.capabilities,
        datasetVersionId: input.datasetVersionId,
        lifecycle: "candidate",
        now,
      });
      const promotionBlockers: string[] = [];
      if (!input.evaluationSetId) {
        promotionBlockers.push("evaluation_set_required");
      }
      const candidate: ModelCandidateRecord = {
        id: input.id,
        modelId: model.id,
        datasetVersionId: input.datasetVersionId,
        evaluationSetId: input.evaluationSetId ?? null,
        promotionEligible: promotionBlockers.length === 0,
        promotionBlockers,
        approvalState: "review",
        rollbackTargetId: input.rollbackTargetId ?? null,
        notes: input.notes ?? "Model candidate — no inference changes.",
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        modelCandidates: [...state.modelCandidates, candidate],
        updatedAt: now,
      };
      appendAudit(
        createAuditTrailEntry({
          action: "create_model_candidate",
          actorId: input.actorId,
          datasetId: dataset.id,
          versionId: input.datasetVersionId,
          newState: "candidate",
          detail: { modelId: model.id },
          now,
        })
      );
      persist();
      return { model, candidate };
    },

    persist,
  };

  if (!options?.ephemeral && !readPersistedAiDataWorkflowState(dataDir)) {
    persist();
  }

  return service;
}

let singleton: AiDataWorkflowService | null = null;

export function getAiDataWorkflowService(): AiDataWorkflowService {
  if (!singleton) singleton = createAiDataWorkflowService();
  return singleton;
}

export function resetAiDataWorkflowForTests(): void {
  singleton = null;
}
