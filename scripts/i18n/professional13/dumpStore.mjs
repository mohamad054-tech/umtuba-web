import fs from "node:fs";
import path from "node:path";
import { STORE } from "./storeComplete.mjs";

const ROOT = process.cwd();
const en = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/i18n/_en-store.json"), "utf8")
);
const enKeys = Object.keys(en);
const report = {};

for (const [locale, rows] of Object.entries(STORE)) {
  const keys = Object.keys(rows);
  const missing = enKeys.filter((k) => !(k in rows));
  const extra = keys.filter((k) => !(k in en));
  const leaked = enKeys.filter(
    (k) =>
      rows[k] === en[k] &&
      !["UMTUBA", "DEMO", "UM Points", "SANDBOX"].includes(rows[k])
  );
  report[locale] = {
    count: keys.length,
    missing: missing.length,
    extra: extra.length,
    leaked: leaked.length,
    missingKeys: missing.slice(0, 20),
    leakedKeys: leaked.slice(0, 20),
  };
}

const out = path.join(ROOT, "scripts/i18n/professional13/store.json");
fs.writeFileSync(out, `${JSON.stringify(STORE, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
