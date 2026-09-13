import { buildApprovedDraftFile, writeApprovedDraftFile } from "../../lib/services/cj/launchDraftFile";
import { readLaunchMixFile } from "../../lib/services/cj/launchCatalogFile";
import { readProfitGateV2File } from "../../lib/services/cj/profitCatalogFile";

function main() {
  const mix = readLaunchMixFile();
  if (!mix) {
    throw new Error("Missing data/cj-store-launch-mix-v1.json");
  }
  const catalog = buildApprovedDraftFile(mix, readProfitGateV2File());
  writeApprovedDraftFile(catalog);
  const s = catalog.summary;
  process.stdout.write(`APPROVED_PRODUCTS=${s.approved_products}\n`);
  process.stdout.write(`HERO_PRODUCTS=${s.hero_products}\n`);
  process.stdout.write(`STANDARD_PRODUCTS=${s.standard_products}\n`);
  process.stdout.write(`PRODUCTS_FLAGGED=${s.products_flagged}\n`);
}

main();
