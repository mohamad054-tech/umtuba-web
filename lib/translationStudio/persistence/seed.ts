import { MESSAGE_CATALOGS } from "../../i18n/messages/catalogs";
import { enMessages } from "../../i18n/messages/en";
import type { TranslationKey } from "../../i18n/messages/types";
import { listStudioLanguages } from "../languages";
import { seedUmtubaTerminology } from "../terminology";
import { sourceFingerprint } from "../normalize";
import type {
  PersistedStudioState,
  StudioNamespace,
  StudioTranslationKey,
  StudioTranslationValue,
  TranslationMemoryEntry,
} from "../types";

function namespaceForKey(key: string): string {
  return key.split(".")[0] ?? "app";
}

export function buildSeedPersistedState(
  now = new Date().toISOString()
): PersistedStudioState {
  const languages = listStudioLanguages();
  const namespaceNames = new Set<string>();
  for (const key of Object.keys(enMessages) as TranslationKey[]) {
    namespaceNames.add(namespaceForKey(key));
  }

  const namespaces: StudioNamespace[] = [...namespaceNames]
    .sort()
    .map((name) => ({
      id: `ns_${name}`,
      name,
      description: `Foundation namespace for ${name}.* keys`,
    }));

  const keys: StudioTranslationKey[] = [];
  const values: StudioTranslationValue[] = [];
  const memory: TranslationMemoryEntry[] = [];
  let keySeq = 0;
  let valueSeq = 0;
  let memSeq = 0;

  for (const key of Object.keys(enMessages) as TranslationKey[]) {
    keySeq += 1;
    const ns = namespaceForKey(key);
    const keyId = `key_${keySeq}`;
    const sourceText = enMessages[key];
    keys.push({
      id: keyId,
      namespaceId: `ns_${ns}`,
      key,
      sourceText,
      description: `Seeded from lib/i18n catalog key ${key}`,
    });

    for (const lang of languages) {
      valueSeq += 1;
      const raw = MESSAGE_CATALOGS[lang.code][key] ?? "";
      let status: StudioTranslationValue["status"] = "approved";
      if (!raw) status = "missing";
      else if (lang.code === "en" || lang.code === "ar") status = "approved";
      else if (raw === enMessages[key] && key.startsWith("nav.")) {
        status = "needs_review";
      }

      values.push({
        id: `val_${valueSeq}`,
        keyId,
        language: lang.code,
        value: raw,
        status,
        createdAt: now,
        updatedAt: now,
        createdBy: "system:seed",
        updatedBy: "system:seed",
        approvedBy: status === "approved" ? "system:seed" : null,
        suggestionId: null,
        version: 1,
      });

      if (status === "approved" && lang.code !== "en" && raw) {
        memSeq += 1;
        memory.push({
          id: `tm_${memSeq}`,
          sourceFingerprint: sourceFingerprint(sourceText),
          sourceText,
          language: lang.code,
          translatedText: raw,
          status: "approved",
          namespaceId: `ns_${ns}`,
          createdAt: now,
          createdBy: "system:seed",
        });
      }
    }
  }

  return {
    schemaVersion: 1,
    updatedAt: now,
    languages,
    namespaces,
    keys,
    values,
    memory,
    terminology: seedUmtubaTerminology(),
    suggestions: [],
    versions: [],
    auditLog: [
      {
        id: "audit_seed",
        entityType: "translation_value",
        entityId: "seed",
        action: "seed_initialized",
        actorId: "system:seed",
        detail: { keyCount: keys.length, valueCount: values.length },
        createdAt: now,
      },
    ],
  };
}
