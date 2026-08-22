import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROFILE_CLOSEOUT_CATALOGS,
  PROFILE_CLOSEOUT_KEYS,
} from "./profileCloseoutCatalog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const LOCALE_FILES = {
  en: "lib/i18n/messages/en.ts",
  ar: "lib/i18n/messages/ar.ts",
  fr: "lib/i18n/messages/fr.ts",
  es: "lib/i18n/messages/es.ts",
  de: "lib/i18n/messages/de.ts",
  pt: "lib/i18n/messages/pt.ts",
  id: "lib/i18n/messages/id.ts",
  hi: "lib/i18n/messages/hi.ts",
  ru: "lib/i18n/messages/ru.ts",
  tr: "lib/i18n/messages/tr.ts",
  "zh-CN": "lib/i18n/messages/zh-CN.ts",
  ja: "lib/i18n/messages/ja.ts",
  ko: "lib/i18n/messages/ko.ts",
};

function tsString(value) {
  return JSON.stringify(value);
}

function formatEntries(catalog) {
  return PROFILE_CLOSEOUT_KEYS.map((key) => {
    const value = catalog[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Missing ${key}`);
    }
    return `  ${tsString(key)}: ${tsString(value)},`;
  }).join("\n");
}

function spliceLocaleFile(locale, relativePath) {
  const path = join(ROOT, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes('"profile.linkedArticle"')) {
    console.log(`skip existing keys: ${relativePath}`);
    return;
  }
  const marker = `"profile.umLife"`;
  const index = source.indexOf(marker);
  if (index < 0) {
    throw new Error(`Missing profile.umLife in ${relativePath}`);
  }
  const lineEnd = source.indexOf("\n", index);
  const insertAt = lineEnd < 0 ? source.length : lineEnd + 1;
  const block = `${formatEntries(PROFILE_CLOSEOUT_CATALOGS[locale])}\n`;
  writeFileSync(path, source.slice(0, insertAt) + block + source.slice(insertAt));
}

function spliceTypes() {
  const path = join(ROOT, "lib/i18n/messages/types.ts");
  const source = readFileSync(path, "utf8");
  if (source.includes('"profile.linkedArticle"')) {
    console.log("skip existing keys: types.ts");
    return;
  }
  const marker = `"profile.umLife"`;
  const index = source.indexOf(marker);
  if (index < 0) {
    throw new Error("Missing profile.umLife in types.ts");
  }
  const lineEnd = source.indexOf("\n", index);
  const insertAt = lineEnd < 0 ? source.length : lineEnd + 1;
  const block = PROFILE_CLOSEOUT_KEYS.map(
    (key) => `  ${tsString(key)}: string;`
  ).join("\n");
  writeFileSync(path, `${source.slice(0, insertAt)}${block}\n${source.slice(insertAt)}`);
}

function spliceFoundation() {
  const path = join(ROOT, "scripts/i18n/_en-foundation.json");
  const json = JSON.parse(readFileSync(path, "utf8"));
  for (const key of PROFILE_CLOSEOUT_KEYS) {
    json[key] = PROFILE_CLOSEOUT_CATALOGS.en[key];
  }
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

for (const key of PROFILE_CLOSEOUT_KEYS) {
  for (const [locale, catalog] of Object.entries(PROFILE_CLOSEOUT_CATALOGS)) {
    if (!catalog[key]) {
      throw new Error(`${locale} missing ${key}`);
    }
  }
}

spliceTypes();
for (const [locale, file] of Object.entries(LOCALE_FILES)) {
  spliceLocaleFile(locale, file);
}
spliceFoundation();
console.log(`spliced ${PROFILE_CLOSEOUT_KEYS.length} closeout keys into 13 catalogs`);
