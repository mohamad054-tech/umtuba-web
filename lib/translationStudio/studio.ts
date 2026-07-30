/**
 * Compatibility facade over persistent workflow.
 */

import {
  createTranslationStudioWorkflow,
  getTranslationStudioWorkflow,
  type TranslationStudioWorkflow,
} from "./workflow/workflowService";
import type { StudioSnapshot } from "./types";

export type TranslationStudio = {
  getSnapshot(): StudioSnapshot;
  getLanguage(code: string): StudioSnapshot["languages"][number] | null;
  getNamespace(id: string): StudioSnapshot["namespaces"][number] | null;
  getKey(id: string): StudioSnapshot["keys"][number] | null;
  listKeys(namespaceId?: string): StudioSnapshot["keys"];
  listValuesForKey(keyId: string): StudioSnapshot["values"];
  listTerminology(): StudioSnapshot["terminology"];
  listSuggestions(): StudioSnapshot["suggestions"];
  workflow: TranslationStudioWorkflow;
};

export function createTranslationStudio(options?: {
  dataDir?: string;
  ephemeral?: boolean;
}): TranslationStudio {
  const workflow = createTranslationStudioWorkflow(options);
  return {
    workflow,
    getSnapshot() {
      return workflow.getSnapshot();
    },
    getLanguage(code) {
      return workflow.getSnapshot().languages.find((l) => l.code === code) ?? null;
    },
    getNamespace(id) {
      return workflow.getSnapshot().namespaces.find((n) => n.id === id) ?? null;
    },
    getKey(id) {
      return workflow.getSnapshot().keys.find((k) => k.id === id) ?? null;
    },
    listKeys(namespaceId) {
      const keys = workflow.getSnapshot().keys;
      return namespaceId ? keys.filter((k) => k.namespaceId === namespaceId) : keys;
    },
    listValuesForKey(keyId) {
      return workflow.getSnapshot().values.filter((v) => v.keyId === keyId);
    },
    listTerminology() {
      return workflow.getSnapshot().terminology;
    },
    listSuggestions() {
      return workflow.getSnapshot().suggestions;
    },
  };
}

export function getTranslationStudio(): TranslationStudio {
  const workflow = getTranslationStudioWorkflow();
  return {
    workflow,
    getSnapshot() {
      return workflow.getSnapshot();
    },
    getLanguage(code) {
      return workflow.getSnapshot().languages.find((l) => l.code === code) ?? null;
    },
    getNamespace(id) {
      return workflow.getSnapshot().namespaces.find((n) => n.id === id) ?? null;
    },
    getKey(id) {
      return workflow.getSnapshot().keys.find((k) => k.id === id) ?? null;
    },
    listKeys(namespaceId) {
      const keys = workflow.getSnapshot().keys;
      return namespaceId ? keys.filter((k) => k.namespaceId === namespaceId) : keys;
    },
    listValuesForKey(keyId) {
      return workflow.getSnapshot().values.filter((v) => v.keyId === keyId);
    },
    listTerminology() {
      return workflow.getSnapshot().terminology;
    },
    listSuggestions() {
      return workflow.getSnapshot().suggestions;
    },
  };
}
