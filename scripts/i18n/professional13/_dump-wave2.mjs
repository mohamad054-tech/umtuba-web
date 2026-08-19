import fs from "node:fs";
import { parseNamedExport } from "../extractCatalog.mjs";

const wave = parseNamedExport(
  "D:/umtuba-central/repos/_tmp-central-web-localization-wave2-v1/lib/i18n/messages/en.ts",
  "enMessages"
);
fs.writeFileSync(
  "scripts/i18n/professional13/_wave2-en.json",
  JSON.stringify(wave, null, 2)
);
console.log(Object.keys(wave).length);
