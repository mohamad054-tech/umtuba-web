/**
 * AI Data Platform service — registries and promotion gates only.
 * Does not train, fine-tune, or change inference.
 */

import { createKnowledgeRights } from "../knowledgeAcquisition/rightsEngine";
import { scoreKnowledgeQuality } from "../knowledgeAcquisition/qualityEngine";
import type {
  KnowledgeDomain,
  KnowledgeEligibility,
  KnowledgeRightsRecord,
  RightsStatus,
} from "../knowledgeAcquisition/types";
import {
  emptyAiDataPlatformState,
  readPersistedAiDataPlatformState,
  resolveAiDataPlatformDataDir,
  writePersistedAiDataPlatformState,
} from "./fileStore";
import { createPromotionQueueEntry } from "./promotionGates";
import { assertDatasetEligibleForExperiment } from "./rightsIntegration";
import { buildAiDataPlatformSeedState } from "./seed";
import type {
  AiDatasetRecord,
  ContentSensitivity,
  DatasetKind,
  DatasetStatus,
  DatasetVersionRecord,
  EvaluationSetKind,
  EvaluationSetRecord,
  ExperimentRecord,
  ExperimentStatus,
  ModelLifecycle,
  ModelRecord,
  PersistedAiDataPlatformState,
  PromotionGateChecklist,
  PromotionQueueEntry,
} from "./types";

export type RegisterDatasetInput = {
  id: string;
  name: string;
  version: string;
  description: string;
  owner?: string | null;
  kind: DatasetKind;
  status?: DatasetStatus;
  sourceAssetIds?: string[];
  knowledgeSourceIds?: string[];
  translationSourceIds?: string[];
  learningSourceIds?: string[];
  codingSourceIds?: string[];
  commerceSourceIds?: string[];
  languages?: string[];
  domains?: KnowledgeDomain[];
  rightsStatus?: RightsStatus;
  rights?: KnowledgeRightsRecord;
  eligibility?: KnowledgeEligibility[];
  sensitivity?: ContentSensitivity;
  sizeBytes?: number;
  now?: string;
};

export type AiDataPlatformService = {
  getState(): PersistedAiDataPlatformState;
  listDatasets(): AiDatasetRecord[];
  listVersions(): DatasetVersionRecord[];
  listEvaluationSets(): EvaluationSetRecord[];
  listExperiments(): ExperimentRecord[];
  listModels(): ModelRecord[];
  listPromotionQueue(): PromotionQueueEntry[];
  getDataset(id: string): AiDatasetRecord | null;
  getVersion(id: string): DatasetVersionRecord | null;
  getModel(id: string): ModelRecord | null;
  registerDataset(input: RegisterDatasetInput): AiDatasetRecord;
  createDatasetVersion(input: {
    id: string;
    datasetId: string;
    version: string;
    parentVersion?: string | null;
    createdFrom?: string | null;
    changes: string;
    sizeBytes?: number;
    languageDistribution?: Record<string, number>;
    domainDistribution?: Record<string, number>;
    approved?: boolean;
    now?: string;
  }): DatasetVersionRecord;
  registerEvaluationSet(input: {
    id: string;
    name: string;
    kind: EvaluationSetKind;
    description: string;
    languages?: string[];
    domains?: KnowledgeDomain[];
    itemCount?: number;
    linkedDatasetIds?: string[];
    now?: string;
  }): EvaluationSetRecord;
  registerExperiment(input: {
    id: string;
    modelFamily: string;
    datasetVersionId: string;
    hyperparameters?: Record<string, unknown>;
    owner?: string | null;
    notes?: string;
    modelId?: string | null;
    now?: string;
  }): ExperimentRecord;
  registerModel(input: {
    id: string;
    family: string;
    version: string;
    provider: string;
    architecture: string;
    capabilities?: string[];
    datasetVersionId?: string | null;
    lifecycle?: ModelLifecycle;
    now?: string;
  }): ModelRecord;
  enqueuePromotion(input: {
    id: string;
    modelId: string;
    toStatus: ModelLifecycle;
    checklist: PromotionGateChecklist;
    requestedBy?: string | null;
    notes?: string;
    now?: string;
  }): PromotionQueueEntry;
  persist(): void;
};

export function createAiDataPlatformService(options?: {
  dataDir?: string;
  ephemeral?: boolean;
  seed?: boolean;
}): AiDataPlatformService {
  const dataDir = resolveAiDataPlatformDataDir(options?.dataDir);
  const now0 = new Date().toISOString();
  let state: PersistedAiDataPlatformState = options?.ephemeral
    ? options.seed === false
      ? emptyAiDataPlatformState(now0)
      : buildAiDataPlatformSeedState(now0)
    : readPersistedAiDataPlatformState(dataDir) ??
      (options?.seed === false
        ? emptyAiDataPlatformState(now0)
        : buildAiDataPlatformSeedState(now0));

  const persist = () => {
    if (options?.ephemeral) return;
    writePersistedAiDataPlatformState(dataDir, state);
  };

  const service: AiDataPlatformService = {
    getState: () => state,
    listDatasets: () => [...state.datasets],
    listVersions: () => [...state.versions],
    listEvaluationSets: () => [...state.evaluationSets],
    listExperiments: () => [...state.experiments],
    listModels: () => [...state.models],
    listPromotionQueue: () => [...state.promotionQueue],
    getDataset: (id) => state.datasets.find((d) => d.id === id) ?? null,
    getVersion: (id) => state.versions.find((v) => v.id === id) ?? null,
    getModel: (id) => state.models.find((m) => m.id === id) ?? null,

    registerDataset(input) {
      if (state.datasets.some((d) => d.id === input.id)) {
        throw new Error(`Dataset already registered: ${input.id}`);
      }
      const now = input.now ?? new Date().toISOString();
      const rights =
        input.rights ??
        createKnowledgeRights({
          status: input.rightsStatus ?? "unknown",
          owner: input.owner,
        });
      const quality = scoreKnowledgeQuality({
        title: input.name,
        contentPreview: input.description,
        hasMetadata: true,
        languageCount: (input.languages ?? []).length,
        domainCount: (input.domains ?? []).length,
        freshnessDays: 0,
        humanReviewed: false,
      });
      const eligibility: KnowledgeEligibility[] =
        input.eligibility ??
        (rights.status === "unknown" || rights.status === "restricted"
          ? ["ineligible"]
          : ["eligible_for_internal_reuse"]);
      const languages = input.languages ?? [];
      const domains = input.domains ?? ["general"];
      const record: AiDatasetRecord = {
        id: input.id,
        name: input.name,
        version: input.version,
        description: input.description,
        owner: input.owner ?? null,
        kind: input.kind,
        status: input.status ?? "draft",
        sourceAssetIds: input.sourceAssetIds ?? [],
        knowledgeSourceIds: input.knowledgeSourceIds ?? [],
        translationSourceIds: input.translationSourceIds ?? [],
        learningSourceIds: input.learningSourceIds ?? [],
        codingSourceIds: input.codingSourceIds ?? [],
        commerceSourceIds: input.commerceSourceIds ?? [],
        languages,
        domains,
        rights,
        quality,
        eligibility,
        sensitivity: input.sensitivity ?? "internal",
        statistics: {
          assetCount: (input.sourceAssetIds ?? []).length,
          sizeBytes: input.sizeBytes ?? 0,
          languageDistribution: Object.fromEntries(
            languages.map((l) => [l, 1])
          ),
          domainDistribution: Object.fromEntries(
            domains.map((d) => [d, 1])
          ),
        },
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        datasets: [...state.datasets, record],
        updatedAt: now,
      };
      persist();
      return record;
    },

    createDatasetVersion(input) {
      if (state.versions.some((v) => v.id === input.id)) {
        throw new Error(`Version already exists: ${input.id}`);
      }
      const dataset = state.datasets.find((d) => d.id === input.datasetId);
      if (!dataset) throw new Error(`Unknown dataset: ${input.datasetId}`);
      const now = input.now ?? new Date().toISOString();
      const record: DatasetVersionRecord = {
        id: input.id,
        datasetId: input.datasetId,
        version: input.version,
        parentVersion: input.parentVersion ?? null,
        createdFrom: input.createdFrom ?? null,
        changes: input.changes,
        sizeBytes: input.sizeBytes ?? dataset.statistics.sizeBytes,
        languageDistribution:
          input.languageDistribution ?? dataset.statistics.languageDistribution,
        domainDistribution:
          input.domainDistribution ?? dataset.statistics.domainDistribution,
        qualityMetrics: dataset.quality,
        approved: input.approved ?? false,
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        versions: [...state.versions, record],
        datasets: state.datasets.map((d) =>
          d.id === dataset.id
            ? { ...d, version: input.version, updatedAt: now }
            : d
        ),
        updatedAt: now,
      };
      persist();
      return record;
    },

    registerEvaluationSet(input) {
      if (state.evaluationSets.some((e) => e.id === input.id)) {
        throw new Error(`Evaluation set already exists: ${input.id}`);
      }
      const now = input.now ?? new Date().toISOString();
      const record: EvaluationSetRecord = {
        id: input.id,
        name: input.name,
        kind: input.kind,
        description: input.description,
        languages: input.languages ?? [],
        domains: input.domains ?? ["general"],
        itemCount: input.itemCount ?? 0,
        linkedDatasetIds: input.linkedDatasetIds ?? [],
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        evaluationSets: [...state.evaluationSets, record],
        updatedAt: now,
      };
      persist();
      return record;
    },

    registerExperiment(input) {
      if (state.experiments.some((e) => e.id === input.id)) {
        throw new Error(`Experiment already exists: ${input.id}`);
      }
      const version = state.versions.find(
        (v) => v.id === input.datasetVersionId
      );
      if (!version) {
        throw new Error(`Unknown dataset version: ${input.datasetVersionId}`);
      }
      const dataset = state.datasets.find((d) => d.id === version.datasetId);
      if (!dataset) throw new Error(`Unknown dataset for version`);
      const gate = assertDatasetEligibleForExperiment({ dataset, version });
      const now = input.now ?? new Date().toISOString();
      const status: ExperimentStatus = gate.allowed ? "planned" : "blocked";
      const record: ExperimentRecord = {
        id: input.id,
        modelId: input.modelId ?? null,
        modelFamily: input.modelFamily,
        datasetVersionId: input.datasetVersionId,
        hyperparameters: input.hyperparameters ?? {},
        startedAt: null,
        finishedAt: null,
        metrics: {},
        artifactRefs: [],
        status,
        owner: input.owner ?? null,
        notes: gate.allowed
          ? (input.notes ?? "")
          : `Blocked: ${gate.blockers.join(", ")}. ${input.notes ?? ""}`.trim(),
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        experiments: [...state.experiments, record],
        updatedAt: now,
      };
      persist();
      return record;
    },

    registerModel(input) {
      if (state.models.some((m) => m.id === input.id)) {
        throw new Error(`Model already registered: ${input.id}`);
      }
      const now = input.now ?? new Date().toISOString();
      const lifecycle = input.lifecycle ?? "draft";
      const record: ModelRecord = {
        id: input.id,
        family: input.family,
        version: input.version,
        provider: input.provider,
        architecture: input.architecture,
        capabilities: input.capabilities ?? [],
        datasetVersionId: input.datasetVersionId ?? null,
        evaluationResults: {},
        releaseStatus: lifecycle,
        rollbackTargetId: null,
        lifecycle,
        experimentIds: [],
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        models: [...state.models, record],
        updatedAt: now,
      };
      persist();
      return record;
    },

    enqueuePromotion(input) {
      const model = state.models.find((m) => m.id === input.modelId);
      if (!model) throw new Error(`Unknown model: ${input.modelId}`);
      const entry = createPromotionQueueEntry({
        id: input.id,
        modelId: input.modelId,
        fromStatus: model.lifecycle,
        toStatus: input.toStatus,
        checklist: input.checklist,
        requestedBy: input.requestedBy,
        notes: input.notes,
        now: input.now,
      });
      state = {
        ...state,
        promotionQueue: [entry, ...state.promotionQueue],
        updatedAt: entry.updatedAt,
      };
      persist();
      return entry;
    },

    persist,
  };

  if (!options?.ephemeral && !readPersistedAiDataPlatformState(dataDir)) {
    persist();
  }

  return service;
}

let singleton: AiDataPlatformService | null = null;

export function getAiDataPlatformService(): AiDataPlatformService {
  if (!singleton) singleton = createAiDataPlatformService();
  return singleton;
}

export function resetAiDataPlatformForTests(): void {
  singleton = null;
}
