/**
 * Generate 13-locale catalogs from Wave 2 + professional overlays.
 * Fails if any FoundationMessages / StoreMessages key is still English
 * for a non-English locale (except allowlisted brand tokens).
 */
import fs from "node:fs";
import path from "node:path";
import { parseNamedExport, tsString } from "../extractCatalog.mjs";
import { LANGUAGE_NAMES } from "./languageNames.mjs";
import { DELTA } from "./delta.mjs";
import { LEARNING } from "./learning.mjs";
import { LEARNING_REST } from "./learningRest.mjs";

const ROOT = process.cwd();
const WAVE2 = path.resolve(
  ROOT,
  "../_tmp-central-web-localization-wave2-v1/lib/i18n/messages"
);

const NEW_LOCALES = ["id", "hi", "ru", "tr", "zh-CN", "ja", "ko"];
const WAVE2_FILE = {
  id: "id.ts",
  hi: "hi.ts",
  ru: "ru.ts",
  tr: "tr.ts",
  "zh-CN": "zh-CN.ts",
  ja: "ja.ts",
};

const ALLOW_ENGLISH = new Set([
  "UMTUBA",
  "UM Points",
  "SANDBOX",
  "DEMO",
  "Hello City",
  "Alpha 0.2 · Built for a new generation",
]);

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function mergeLearning(locale) {
  return {
    ...(LEARNING[locale] ?? {}),
    ...(LEARNING_REST[locale] ?? {}),
  };
}

function formatObject(name, typeName, rows, header) {
  const lines = [
    header,
    "",
    `export const ${name}: ${typeName} = {`,
  ];
  for (const [key, value] of Object.entries(rows)) {
    lines.push(`  ${tsString(key)}: ${tsString(value)},`);
  }
  lines.push("};", "");
  return lines.join("\n");
}

function writeFoundation(locale, catalog) {
  const ident =
    locale === "zh-CN" ? "zhCNMessages" : `${locale}Messages`;
  const storeIdent =
    locale === "zh-CN" ? "storeZhCNMessages" : `store${locale[0].toUpperCase()}${locale.slice(1)}Messages`;
  const file =
    locale === "zh-CN"
      ? "lib/i18n/messages/zh-CN.ts"
      : `lib/i18n/messages/${locale}.ts`;
  const storeImport =
    locale === "zh-CN"
      ? "storeZhCNMessages"
      : storeIdent;
  const storeKeys = new Set(
    Object.keys(loadJson("scripts/i18n/_en-store.json"))
  );
  const foundation = {};
  for (const [k, v] of Object.entries(catalog)) {
    if (!storeKeys.has(k)) foundation[k] = v;
  }
  const body = [
    `import { ${storeImport} } from "./storeCatalogs";`,
    `import type { FoundationMessages } from "./types";`,
    "",
    `/** Professional native chrome. UMTUBA stays Latin. Authored content stays source-language. */`,
    `export const ${ident}: FoundationMessages = {`,
    `  ...${storeImport},`,
  ];
  for (const [key, value] of Object.entries(foundation)) {
    body.push(`  ${tsString(key)}: ${tsString(value)},`);
  }
  body.push("};", "");
  fs.writeFileSync(path.join(ROOT, file), body.join("\n"), "utf8");
}

function main() {
  const enFoundation = loadJson("scripts/i18n/_en-foundation.json");
  const enStore = loadJson("scripts/i18n/_en-store.json");
  const storeOverlays = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "scripts/i18n/professional13/store.json"),
      "utf8"
    )
  );
  const koFoundation = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "scripts/i18n/professional13/koFoundation.json"),
      "utf8"
    )
  );

  const missing = [];
  const leaked = [];

  for (const locale of NEW_LOCALES) {
    let base = {};
    if (locale === "ko") {
      base = { ...koFoundation };
    } else {
      const exportName =
        locale === "zh-CN" ? "zhCNMessages" : `${locale}Messages`;
      base = parseNamedExport(path.join(WAVE2, WAVE2_FILE[locale]), exportName);
    }

    const catalog = {
      ...enFoundation,
      ...enStore,
      ...base,
      ...(LANGUAGE_NAMES[locale] ?? {}),
      ...(DELTA[locale] ?? {}),
      ...mergeLearning(locale),
      ...(storeOverlays[locale] ?? {}),
    };

    for (const key of Object.keys(enFoundation)) {
      if (!catalog[key]) missing.push(`${locale} foundation ${key}`);
    }
    for (const key of Object.keys(enStore)) {
      if (!catalog[key]) missing.push(`${locale} store ${key}`);
    }
    if (locale !== "en") {
      for (const [key, value] of Object.entries(catalog)) {
        const enVal = enFoundation[key] ?? enStore[key];
        if (!enVal || ALLOW_ENGLISH.has(value)) continue;
        if (value === enVal && !key.startsWith("languages.")) {
          leaked.push(`${locale} ${key}`);
        }
      }
    }

    writeFoundation(locale, catalog);
  }

  const storeBlocks = [];
  for (const locale of NEW_LOCALES) {
    const ident =
      locale === "zh-CN"
        ? "storeZhCNMessages"
        : `store${locale[0].toUpperCase()}${locale.slice(1)}Messages`;
    const rows = {
      ...enStore,
      ...(storeOverlays[locale] ?? {}),
    };
    storeBlocks.push(
      formatObject(ident, "StoreMessages", rows, "")
    );
  }
  const existing = fs.readFileSync(
    path.join(ROOT, "lib/i18n/messages/storeCatalogs.ts"),
    "utf8"
  );
  const marker = "\n/* === PROFESSIONAL_13_STORE_CATALOGS === */\n";
  const head = existing.includes(marker)
    ? existing.slice(0, existing.indexOf(marker))
    : existing.replace(/\s*$/, "\n");
  fs.writeFileSync(
    path.join(ROOT, "lib/i18n/messages/storeCatalogs.ts"),
    `${head}${marker}${storeBlocks.join("\n")}`,
    "utf8"
  );

  if (missing.length || leaked.length) {
    console.error(
      JSON.stringify({ missing: missing.slice(0, 80), leaked: leaked.slice(0, 80), missingCount: missing.length, leakedCount: leaked.length }, null, 2)
    );
    process.exitCode = 1;
  } else {
    console.log("professional-13 catalogs written; key completeness + leakage gate PASS");
  }
}

main();
