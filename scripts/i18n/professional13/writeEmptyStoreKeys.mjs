import fs from "node:fs";

const en = JSON.parse(
  fs.readFileSync("scripts/i18n/_en-store.json", "utf8")
);
const locales = ["id", "hi", "ru", "tr", "zh-CN", "ja", "ko"];
const existing = JSON.parse(
  fs.readFileSync("scripts/i18n/professional13/store.json", "utf8")
);

for (const locale of locales) {
  existing[locale] = existing[locale] ?? {};
}

fs.writeFileSync(
  "scripts/i18n/professional13/store.json",
  JSON.stringify(existing, null, 2)
);
console.log(
  locales.map((l) => `${l}:${Object.keys(existing[l]).length}/${Object.keys(en).length}`).join(" ")
);
