/**
 * Import / Export contracts only (JSON, CSV, XLIFF).
 * No external integrations in Foundation V1.
 */

import type {
  StudioLanguageCode,
  TranslationValueStatus,
} from "../types";

export type TranslationExportFormat = "json" | "csv" | "xliff";

export type TranslationCatalogExportRecord = {
  namespace: string;
  key: string;
  sourceText: string;
  language: StudioLanguageCode;
  value: string;
  status: TranslationValueStatus;
};

export type TranslationJsonExportEnvelope = {
  format: "umtuba.translation_catalog.json";
  version: "1";
  exportedAt: string;
  records: TranslationCatalogExportRecord[];
};

export type TranslationCsvExportContract = {
  format: "umtuba.translation_catalog.csv";
  version: "1";
  /** Stable column order for future writers. */
  columns: readonly [
    "namespace",
    "key",
    "sourceText",
    "language",
    "value",
    "status",
  ];
};

export type TranslationXliffExportContract = {
  format: "umtuba.translation_catalog.xliff";
  version: "1";
  /** XLIFF 2.0 intent — implementation deferred. */
  xliffVersion: "2.0";
  notes: string;
};

export const TRANSLATION_CSV_EXPORT_CONTRACT: TranslationCsvExportContract = {
  format: "umtuba.translation_catalog.csv",
  version: "1",
  columns: [
    "namespace",
    "key",
    "sourceText",
    "language",
    "value",
    "status",
  ],
};

export const TRANSLATION_XLIFF_EXPORT_CONTRACT: TranslationXliffExportContract =
  {
    format: "umtuba.translation_catalog.xliff",
    version: "1",
    xliffVersion: "2.0",
    notes:
      "Contract only — XLIFF writer/reader not implemented in Foundation V1.",
  };

export type TranslationImportFormat = TranslationExportFormat;

export type TranslationImportRequest = {
  format: TranslationImportFormat;
  /** Opaque payload placeholder — parsers deferred. */
  payload: string;
  dryRun: boolean;
};

export type TranslationImportResultContract = {
  accepted: number;
  rejected: number;
  errors: Array<{ line?: number; message: string }>;
};

export function buildJsonExportEnvelope(
  records: TranslationCatalogExportRecord[],
  exportedAt = new Date().toISOString()
): TranslationJsonExportEnvelope {
  return {
    format: "umtuba.translation_catalog.json",
    version: "1",
    exportedAt,
    records,
  };
}
