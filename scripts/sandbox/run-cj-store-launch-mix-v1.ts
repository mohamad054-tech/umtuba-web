import { readProfitGateV2File } from "../../lib/services/cj/profitCatalogFile";
import { buildLaunchMixFile, writeLaunchMixFile } from "../../lib/services/cj/launchCatalogFile";

function main() {
  const v2 = readProfitGateV2File();
  if (!v2 || !v2.products.length) {
    throw new Error("Missing data/cj-profit-gate-v2.json — run Profit Gate V2 first. V2 file was not written.");
  }

  const catalog = buildLaunchMixFile(v2.products);
  writeLaunchMixFile(catalog);
  const s = catalog.summary;
  process.stdout.write(`CANDIDATES_INPUT=${s.candidates_input}\n`);
  process.stdout.write(`LAUNCH_SELECTED=${s.launch_selected}\n`);
  process.stdout.write(`LAUNCH_HERO=${s.launch_hero}\n`);
  process.stdout.write(`LAUNCH_STANDARD=${s.launch_standard}\n`);
  process.stdout.write(`ORGANIC_ONLY=${s.organic_only}\n`);
  process.stdout.write(`HOLD=${s.hold}\n`);
}

main();
