import fs from "node:fs";
import { parseNamedExport } from "./extractCatalog.mjs";

const en = parseNamedExport("lib/i18n/messages/en.ts", "enMessages");
const store = parseNamedExport(
  "lib/i18n/messages/storeCatalogs.ts",
  "storeEnMessages"
);
fs.writeFileSync(
  "scripts/i18n/_en-foundation.json",
  JSON.stringify(en, null, 2)
);
fs.writeFileSync("scripts/i18n/_en-store.json", JSON.stringify(store, null, 2));
console.log("foundation", Object.keys(en).length, "store", Object.keys(store).length);
