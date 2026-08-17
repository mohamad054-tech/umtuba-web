import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLACEHOLDER_RE = /\{(\w+)\}/g;
const PAIR_RE = /"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g;

function loadPairs(path) {
  const text = readFileSync(path, "utf8");
  const map = new Map();
  for (const match of text.matchAll(PAIR_RE)) {
    map.set(match[1], match[2].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
  }
  return map;
}

function placeholders(value) {
  return [...value.matchAll(PLACEHOLDER_RE)].map((m) => m[1]).sort();
}

const root = resolve(import.meta.dirname, "..");
const locales = ["tr", "id", "hi", "ja", "ru", "zh-CN"];
const en = loadPairs(resolve(root, "lib/i18n/messages/en.ts"));
const errors = [];
const brandOk = /UMTUBA|UM Points|you@email\.com|your\.name/;

for (const locale of locales) {
  const catalog = loadPairs(resolve(root, `lib/i18n/messages/${locale}.ts`));
  for (const key of en.keys()) {
    if (!catalog.has(key)) errors.push(`missing ${locale}:${key}`);
    else if (!catalog.get(key).trim()) errors.push(`empty ${locale}:${key}`);
  }
  for (const key of en.keys()) {
    if (!catalog.has(key)) continue;
    const expected = placeholders(en.get(key));
    if (expected.length) {
      const actual = placeholders(catalog.get(key));
      if (actual.join() !== expected.join()) {
        errors.push(`placeholder ${locale}:${key} ${actual} != ${expected}`);
      }
    }
    const value = catalog.get(key);
    const source = en.get(key);
    if (
      !key.startsWith("languages.") &&
      value === source &&
      !brandOk.test(source)
    ) {
      errors.push(`en-leak ${locale}:${key}=${source}`);
    }
  }
}

const zh = loadPairs(resolve(root, "lib/i18n/messages/zh-CN.ts"));
if (zh.get("nav.discover") !== "发现") errors.push("zh-CN Discover must be 发现");
if (["發現", "語言", "設定"].includes(zh.get("nav.discover"))) {
  errors.push("zh-CN leaked Traditional");
}

if (errors.length) {
  console.error(errors.slice(0, 50).join("\n"));
  console.error(`FAIL ${errors.length} issues`);
  process.exit(1);
}
console.log(`PASS web Wave 2 catalogs ${locales.join(",")} keys=${en.size}`);
