/**
 * Knowledge Acquisition Platform service — registry, governance, lineage.
 * Does not train models. Does not scrape or download external datasets.
 */

import { classifyKnowledgeDomains } from "./classification";
import { contentFingerprint, findDuplicateFingerprints } from "./dedupe";
import { decideKnowledgeEligibility } from "./eligibility";
import {
  emptyKnowledgeAcquisitionState,
  readPersistedKnowledgeAcquisitionState,
  resolveKnowledgeAcquisitionDataDir,
  writePersistedKnowledgeAcquisitionState,
} from "./fileStore";
import { createAcquisitionHistoryEntry } from "./history";
import { createGraphEdge, createGraphNode } from "./knowledgeGraph";
import { assertAdvanceAcquisitionStage } from "./pipeline";
import { detectPrivacyFindings } from "./privacyLayer";
import { scoreKnowledgeQuality } from "./qualityEngine";
import { createKnowledgeRights } from "./rightsEngine";
import { buildInternalSeedState } from "./seed";
import type {
  AcquisitionStage,
  KnowledgeAssetRecord,
  KnowledgeDatasetRecord,
  KnowledgeDomain,
  KnowledgeRightsRecord,
  KnowledgeSourceKind,
  KnowledgeSourceRecord,
  PersistedKnowledgeAcquisitionState,
  RightsStatus,
} from "./types";

export type KnowledgeAcquisitionService = {
  getState(): PersistedKnowledgeAcquisitionState;
  listSources(): KnowledgeSourceRecord[];
  listAssets(): KnowledgeAssetRecord[];
  listDatasets(): KnowledgeDatasetRecord[];
  listHistory(): PersistedKnowledgeAcquisitionState["history"];
  getSource(id: string): KnowledgeSourceRecord | null;
  getDataset(id: string): KnowledgeDatasetRecord | null;
  registerSource(input: {
    id: string;
    name: string;
    kind: KnowledgeSourceKind;
    description: string;
    rightsStatus: RightsStatus;
    owner?: string | null;
    license?: string | null;
    domains?: KnowledgeDomain[];
    languages?: string[];
    actorId?: string | null;
    now?: string;
  }): KnowledgeSourceRecord;
  importAsset(input: {
    id: string;
    sourceId: string;
    title: string;
    contentPreview: string;
    mimeHint?: string | null;
    domains?: KnowledgeDomain[];
    languages?: string[];
    rights?: KnowledgeRightsRecord;
    actorId?: string | null;
    now?: string;
  }): KnowledgeAssetRecord;
  advanceAssetStage(input: {
    assetId: string;
    to: AcquisitionStage;
    actorId?: string | null;
    now?: string;
  }): KnowledgeAssetRecord;
  registerDataset(input: {
    id: string;
    version: string;
    name: string;
    sourceId: string;
    assetIds: string[];
    actorId?: string | null;
    now?: string;
  }): KnowledgeDatasetRecord;
  findDuplicates(): string[];
  persist(): void;
};

export function createKnowledgeAcquisitionService(options?: {
  dataDir?: string;
  ephemeral?: boolean;
  seed?: boolean;
}): KnowledgeAcquisitionService {
  const dataDir = resolveKnowledgeAcquisitionDataDir(options?.dataDir);
  const now0 = new Date().toISOString();
  let state: PersistedKnowledgeAcquisitionState =
    options?.ephemeral
      ? options.seed === false
        ? emptyKnowledgeAcquisitionState(now0)
        : buildInternalSeedState(now0)
      : readPersistedKnowledgeAcquisitionState(dataDir) ??
        (options?.seed === false
          ? emptyKnowledgeAcquisitionState(now0)
          : buildInternalSeedState(now0));

  const persist = () => {
    if (options?.ephemeral) return;
    writePersistedKnowledgeAcquisitionState(dataDir, state);
  };

  const appendHistory = (
    entry: ReturnType<typeof createAcquisitionHistoryEntry>
  ) => {
    state = {
      ...state,
      history: [entry, ...state.history].slice(0, 500),
      updatedAt: entry.createdAt,
    };
  };

  const service: KnowledgeAcquisitionService = {
    getState: () => state,
    listSources: () => [...state.sources],
    listAssets: () => [...state.assets],
    listDatasets: () => [...state.datasets],
    listHistory: () => [...state.history],
    getSource: (id) => state.sources.find((s) => s.id === id) ?? null,
    getDataset: (id) => state.datasets.find((d) => d.id === id) ?? null,

    registerSource(input) {
      if (state.sources.some((s) => s.id === input.id)) {
        throw new Error(`Source already registered: ${input.id}`);
      }
      const now = input.now ?? new Date().toISOString();
      const rights = createKnowledgeRights({
        status: input.rightsStatus,
        owner: input.owner,
        license: input.license,
      });
      const record: KnowledgeSourceRecord = {
        id: input.id,
        name: input.name,
        kind: input.kind,
        description: input.description,
        rights,
        stage: "discovered",
        domains: input.domains ?? ["general"],
        languages: input.languages ?? [],
        createdAt: now,
        updatedAt: now,
        createdBy: input.actorId ?? null,
      };
      const node = createGraphNode({
        kind: "source",
        label: record.name,
        refId: record.id,
      });
      state = {
        ...state,
        sources: [...state.sources, record],
        graphNodes: [...state.graphNodes, node],
        updatedAt: now,
      };
      appendHistory(
        createAcquisitionHistoryEntry({
          entityType: "source",
          entityId: record.id,
          action: "registered",
          actorId: input.actorId,
          detail: { kind: record.kind, rightsStatus: rights.status },
          now,
        })
      );
      persist();
      return record;
    },

    importAsset(input) {
      const source = state.sources.find((s) => s.id === input.sourceId);
      if (!source) throw new Error(`Unknown source: ${input.sourceId}`);
      if (state.assets.some((a) => a.id === input.id)) {
        throw new Error(`Asset already exists: ${input.id}`);
      }
      const now = input.now ?? new Date().toISOString();
      const domains =
        input.domains ??
        classifyKnowledgeDomains({
          title: input.title,
          contentPreview: input.contentPreview,
        });
      const languages = input.languages ?? source.languages;
      const rights = input.rights ?? source.rights;
      const quality = scoreKnowledgeQuality({
        title: input.title,
        contentPreview: input.contentPreview,
        hasMetadata: true,
        languageCount: languages.length,
        domainCount: domains.length,
        freshnessDays: 0,
      });
      const privacy = detectPrivacyFindings(input.contentPreview);
      const stage: AcquisitionStage = "imported";
      const eligibility = decideKnowledgeEligibility({
        stage,
        rights,
        quality,
        privacy,
      });
      const record: KnowledgeAssetRecord = {
        id: input.id,
        sourceId: input.sourceId,
        title: input.title,
        contentFingerprint: contentFingerprint(input.contentPreview),
        contentPreview: input.contentPreview.slice(0, 500),
        mimeHint: input.mimeHint ?? null,
        domains,
        languages,
        stage,
        rights,
        quality,
        privacy,
        eligibility,
        datasetIds: [],
        createdAt: now,
        updatedAt: now,
      };
      const assetNode = createGraphNode({
        kind: "asset",
        label: record.title,
        refId: record.id,
      });
      const sourceNodeId = `node_source_${source.id}`;
      const edge = createGraphEdge({
        type: "sourced_from",
        fromNodeId: assetNode.id,
        toNodeId: sourceNodeId,
      });
      state = {
        ...state,
        assets: [...state.assets, record],
        graphNodes: [...state.graphNodes, assetNode],
        graphEdges: [...state.graphEdges, edge],
        updatedAt: now,
      };
      appendHistory(
        createAcquisitionHistoryEntry({
          entityType: "asset",
          entityId: record.id,
          action: "imported",
          actorId: input.actorId,
          detail: {
            sourceId: input.sourceId,
            fingerprint: record.contentFingerprint,
            eligibility,
          },
          now,
        })
      );
      persist();
      return record;
    },

    advanceAssetStage(input) {
      const asset = state.assets.find((a) => a.id === input.assetId);
      if (!asset) throw new Error(`Unknown asset: ${input.assetId}`);
      assertAdvanceAcquisitionStage(asset.stage, input.to);
      const now = input.now ?? new Date().toISOString();
      const eligibility = decideKnowledgeEligibility({
        stage: input.to,
        rights: asset.rights,
        quality: asset.quality,
        privacy: asset.privacy,
      });
      const updated: KnowledgeAssetRecord = {
        ...asset,
        stage: input.to,
        eligibility,
        updatedAt: now,
      };
      state = {
        ...state,
        assets: state.assets.map((a) =>
          a.id === updated.id ? updated : a
        ),
        updatedAt: now,
      };
      appendHistory(
        createAcquisitionHistoryEntry({
          entityType: "asset",
          entityId: updated.id,
          action: `stage_${asset.stage}_to_${input.to}`,
          actorId: input.actorId,
          detail: { from: asset.stage, to: input.to, eligibility },
          now,
        })
      );
      persist();
      return updated;
    },

    registerDataset(input) {
      if (state.datasets.some((d) => d.id === input.id)) {
        throw new Error(`Dataset already registered: ${input.id}`);
      }
      const source = state.sources.find((s) => s.id === input.sourceId);
      if (!source) throw new Error(`Unknown source: ${input.sourceId}`);
      const assets = state.assets.filter((a) =>
        input.assetIds.includes(a.id)
      );
      if (assets.length !== input.assetIds.length) {
        throw new Error("One or more assets missing for dataset");
      }
      for (const a of assets) {
        if (
          a.stage !== "approved" &&
          a.stage !== "dataset_eligible"
        ) {
          throw new Error(
            `Asset ${a.id} not approved/dataset_eligible (stage=${a.stage})`
          );
        }
        if (a.eligibility.includes("ineligible")) {
          throw new Error(`Asset ${a.id} is ineligible`);
        }
      }
      const now = input.now ?? new Date().toISOString();
      const domains = [...new Set(assets.flatMap((a) => a.domains))];
      const languages = [...new Set(assets.flatMap((a) => a.languages))];
      const qualitySummary = assets[0]!.quality;
      const eligibility = decideKnowledgeEligibility({
        stage: "dataset_eligible",
        rights: source.rights,
        quality: qualitySummary,
        privacy: { findings: [], blocking: false, notes: "dataset aggregate" },
      });
      const record: KnowledgeDatasetRecord = {
        id: input.id,
        version: input.version,
        name: input.name,
        sourceId: input.sourceId,
        rights: source.rights,
        qualitySummary,
        languages,
        domains,
        sizeBytes: assets.reduce(
          (s, a) => s + a.contentPreview.length,
          0
        ),
        assetCount: assets.length,
        linkedAssetIds: assets.map((a) => a.id),
        eligibility,
        createdAt: now,
        updatedAt: now,
      };
      const datasetNode = createGraphNode({
        kind: "dataset",
        label: record.name,
        refId: record.id,
      });
      const edges = assets.map((a) =>
        createGraphEdge({
          type: "dataset_contains",
          fromNodeId: datasetNode.id,
          toNodeId: `node_asset_${a.id}`,
        })
      );
      state = {
        ...state,
        datasets: [...state.datasets, record],
        assets: state.assets.map((a) =>
          input.assetIds.includes(a.id)
            ? {
                ...a,
                datasetIds: [...new Set([...a.datasetIds, record.id])],
                stage: "dataset_eligible",
                updatedAt: now,
              }
            : a
        ),
        graphNodes: [...state.graphNodes, datasetNode],
        graphEdges: [...state.graphEdges, ...edges],
        updatedAt: now,
      };
      appendHistory(
        createAcquisitionHistoryEntry({
          entityType: "dataset",
          entityId: record.id,
          action: "registered",
          actorId: input.actorId,
          detail: {
            version: record.version,
            assetCount: record.assetCount,
            eligibility,
          },
          now,
        })
      );
      persist();
      return record;
    },

    findDuplicates() {
      return findDuplicateFingerprints(
        state.assets.map((a) => a.contentFingerprint)
      );
    },

    persist,
  };

  if (!options?.ephemeral && !readPersistedKnowledgeAcquisitionState(dataDir)) {
    persist();
  }

  return service;
}

let singleton: KnowledgeAcquisitionService | null = null;

export function getKnowledgeAcquisitionService(): KnowledgeAcquisitionService {
  if (!singleton) {
    singleton = createKnowledgeAcquisitionService();
  }
  return singleton;
}

export function resetKnowledgeAcquisitionForTests(): void {
  singleton = null;
}
