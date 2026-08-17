import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCityCopyV2Bundle,
  buildExpansionV2Manifest,
} from "./expansionV2Data";

const root = resolve(process.cwd());
const expansionManifest = buildExpansionV2Manifest();
const cityCopy = buildCityCopyV2Bundle();

writeFileSync(
  resolve(root, "data/world/catalog/expansion-v2.json"),
  `${JSON.stringify(expansionManifest, null, 2)}\n`,
  "utf8"
);
writeFileSync(
  resolve(root, "data/world/catalog/city-copy-v2.json"),
  `${JSON.stringify(cityCopy, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      expansionCities: expansionManifest.cities.length,
      copyCities: cityCopy.cities.length,
      countries: expansionManifest.countries.length,
    },
    null,
    2
  )
);
