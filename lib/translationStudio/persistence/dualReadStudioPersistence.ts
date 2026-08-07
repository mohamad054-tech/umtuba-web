/**
 * Dual-read Studio persistence composition V1.
 *
 * - load()/save() delegate to authoritative port (JSON or shadow wrapper).
 * - compareRemoteAsync() performs secondary remote compare only.
 * - Never returns remote state; never merges DB into JSON.
 */

import type { PersistedStudioState } from "../types";
import type { StudioPersistencePort } from "./studioPersistencePort";
import { fingerprintStudioSnapshot } from "./snapshotFingerprint";
import { getStudioDualReadTransport } from "./dualReadContext";
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";
import {
  runStudioDualReadCompare,
  type DualReadCompareResult,
} from "./dualReadCompare";
import type { StudioDualReadObserver } from "./dualReadObserver";
import { noopStudioDualReadObserver } from "./dualReadObserver";
import {
  createShadowReconciliationJournal,
  type ShadowReconciliationJournal,
  type ShadowReconciliationJournalEntryV1,
} from "./shadowReconciliationJournal";

export type DualReadStudioPersistence = StudioPersistencePort & {
  readonly kind: "dual_read";
  /**
   * Explicit async compare against remote. Never mutates authoritative state.
   * Uses request-scoped transport when getReadTransport returns nullish.
   */
  compareRemoteAsync(
    localState?: PersistedStudioState | null
  ): Promise<DualReadCompareResult>;
};

export type CreateDualReadStudioPersistenceOptions = {
  authoritative: StudioPersistencePort;
  getReadTransport?: () => TranslationStudioReadRpcTransport | null;
  observer?: StudioDualReadObserver;
  enableJournal?: boolean;
  journalDataDir?: string;
  journalFilePath?: string;
  journal?: ShadowReconciliationJournal;
  /** Optional shadow journal reader for TRANSIENT_LAG (defaults to same journal file). */
  getShadowJournalEntries?: () => ShadowReconciliationJournalEntryV1[];
  correlationId?: () => string | undefined;
};

export function createDualReadStudioPersistence(
  options: CreateDualReadStudioPersistenceOptions
): DualReadStudioPersistence {
  const getReadTransport =
    options.getReadTransport ?? (() => getStudioDualReadTransport());
  const observer = options.observer ?? noopStudioDualReadObserver;

  const journal: ShadowReconciliationJournal | undefined =
    options.journal ??
    (options.enableJournal
      ? createShadowReconciliationJournal({
          dataDir: options.journalDataDir,
          filePath: options.journalFilePath,
        })
      : undefined);

  const getShadowJournalEntries =
    options.getShadowJournalEntries ??
    (() => (journal ? journal.readEntries() : []));

  return {
    kind: "dual_read",

    load() {
      // Sync JSON authority only — never block on remote; never fire cold RPC.
      return options.authoritative.load();
    },

    save(state) {
      options.authoritative.save(state);
    },

    async compareRemoteAsync(localState) {
      const loaded =
        localState === undefined
          ? options.authoritative.load()
          : localState;
      if (!loaded) {
        return {
          status: "REMOTE_READ_UNAVAILABLE" as const,
          local_hash: "",
          remote_hash: null,
          duration_ms: 0,
          counts: {},
          category: "unavailable" as const,
          message: "No authoritative JSON loaded",
        };
      }
      const hashAtStart = fingerprintStudioSnapshot(loaded);
      return runStudioDualReadCompare({
        local: loaded,
        readTransport: getReadTransport(),
        getCurrentLocalHash: () => {
          const cur = options.authoritative.load();
          return cur ? fingerprintStudioSnapshot(cur) : hashAtStart;
        },
        getShadowJournalEntries,
        dualReadJournal: journal,
        observer,
        correlationId: options.correlationId?.(),
      });
    },
  };
}
