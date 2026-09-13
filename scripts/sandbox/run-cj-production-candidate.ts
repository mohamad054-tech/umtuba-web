import { buildAndWriteProductionCandidate } from "../../lib/services/cj/productionCandidateFile";

const catalog = buildAndWriteProductionCandidate();
const s = catalog.summary;
process.stdout.write(`APPROVED_PRODUCTS=${s.approved_products}\n`);
process.stdout.write(`HERO_PRODUCTS=${s.hero_products}\n`);
process.stdout.write(`STANDARD_PRODUCTS=${s.standard_products}\n`);
process.stdout.write(`LAST_KNOWN_HEALTHY=${s.last_known_healthy}\n`);
process.stdout.write(`LAST_KNOWN_PRICE_REVIEW=${s.last_known_price_review}\n`);
process.stdout.write(`LAST_KNOWN_OUT_OF_STOCK=${s.last_known_out_of_stock}\n`);
process.stdout.write(`LAST_KNOWN_PROVIDER_UNAVAILABLE=${s.last_known_provider_unavailable}\n`);
process.stdout.write(`LAST_KNOWN_SYNC_ERROR=${s.last_known_sync_error}\n`);
process.stdout.write(`LIVE_AUDIT=${catalog.live_audit.status}\n`);
