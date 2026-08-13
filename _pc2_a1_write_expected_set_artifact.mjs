import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const evidenceRaw = fs
  .readFileSync(path.join(ROOT, "_pc2_a1_learning_expected_set_evidence.json"), "utf8")
  .replace(/^\uFEFF/, "");
const evidence = JSON.parse(evidenceRaw);
const outPath = path.join(
  ROOT,
  "worktrees",
  "PC2_A1_LEARNING_EXPECTED_SET_CORRECTION_V1.md"
);

const { stamp, head, alpha, branch, rows } = evidence;
const lines = [];
const a = (s) => lines.push(s);

a("# PC2_A1 — Learning Expected-Set Correction V1");
a("");
a("TASK_ID = PC2_LB001_CORRECTED_POST_REPROBE_GO · A1");
a("REPORT_TYPE = INDEPENDENT_LEARNING_EXPECTED_SET_CORRECTION");
a("MUTATION = NO");
a("GIT_FETCH_PRUNE = YES");
a("");
a("## Stamps");
a("");
a("| Field | Value |");
a("| --- | --- |");
a(`| EVIDENCE_STAMP | ${stamp} |`);
a(
  "| WORKSPACE | `c:\\\\Users\\\\Giga store\\\\Desktop\\\\umtuba\\\\umtuba-web-translation-trunk-port-v1` |"
);
a(`| BRANCH | \`${branch}\` |`);
a(`| HEAD_SHA | \`${head}\` |`);
a(`| ALPHA_TIP | \`origin/alpha-0.2\` = \`${alpha}\` |`);
a(
  "| LEARNING_SOT | `C:\\\\Users\\\\Giga store\\\\Desktop\\\\umtuba\\\\umtuba-web-translation-sot` |"
);
a(
  "| SOT_HEAD_AT_PROBE | `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2` (behind origin/alpha-0.2 by 58; same 34 `*learning_*` files) |"
);
a("| HEAD_vs_ALPHA_LEARNING_SET | EQUAL (34/34 identical filenames) |");
a(
  "| DOMAIN_CONTRACT | filename glob `*learning_*` under `supabase/migrations/` |"
);
a("");
a("## Verdict");
a("");
a("```");
a("EXPECTED_SET_INDEPENDENT_VERDICT=PASS");
a("LEARNING_EXPECTED_COUNT=34");
a("NON_LEARNING_MIGRATIONS_EXCLUDED=YES");
a("CENTRAL_EXPECTED_39_AS_LEARNING_COUNT=REJECTED");
a("CORRECTED_CLOSURE_PATH=CONTINUE (42/46/47 are NOT Learning-owned)");
a("TRIO_42_46_47_LEARNING_OWNED=NO");
a("```");
a("");
a("### Why Central EXPECTED=39 is not Learning");
a("");
a("Arithmetic identity (the prior incorrect construction):");
a("");
a(
  "- Version window `20260828`–`20260866` inclusive = `66 - 28 + 1 = 39` **version slots**"
);
a("- That window is **not** a Learning ownership set");
a("- Inside the same window, tip files matching `*learning_*` = **34**");
a("- Non-Learning / missing slots in that window:");
a("  - `20260842` ADS");
a("  - `20260843` MISSING (no migration file on tip)");
a("  - `20260846` GAMES");
a("  - `20260847` GAMES");
a("  - `20260865` OTHER (Articles teaser)");
a("- Check: `39 - 5 = 34` matches `*learning_*` tip count");
a("");
a(
  "Central claim `EXPECTED=39 Learning` therefore **fails** independent validation against the `*learning_*` domain contract. Correct Learning expected count on release tips = **34**."
);
a("");
a("## Explicit trio classification (mandatory)");
a("");
a("| MIGRATION_ID | CLASS | SOURCE_EVIDENCE |");
a("| --- | --- | --- |");
a(
  "| 20260842 | **ADS** | Filename `20260842_ads_deliverable_binding_database_authority_v1.sql`; SQL header Ads Deliverable Binding Database Authority Hardening V1; mutates `public.ads` / `ads_*` RPCs; zero `learning_` tokens in SQL (rg count 0); git intro `d84b880 feat(ads): bridge persisted deliverables to canonical inventory`; not `*learning_*`. |"
);
a(
  "| 20260846 | **GAMES** | Filename `20260846_games_platform_foundation_v1.sql`; SQL header UM Games Platform Foundation V1; creates `public.games` + game_* tables; comment renumbered from 20260842 to avoid Ads collision and sits after Learning 20260841; zero `learning_` tokens; git `a98f4f8 chore(games): renumber games migrations`; `lib/games/gamesFoundation.test.ts` asserts Games owns 20260846 after Learning 20260841. |"
);
a(
  "| 20260847 | **GAMES** | Filename `20260847_games_catalog_foundation_v1.sql`; SQL header UM Games Catalog Foundation V1; extends `public.games` catalog metadata; comment renumbered from 20260843 after Ads claimed 20260842; zero `learning_` tokens; same Games renumber commit `a98f4f8`. |"
);
a("");
a(
  "**Gate:** Because none of 42/46/47 is Learning-owned or mandatory for Learning release acceptance, corrected closure path is **not** stopped by this trio."
);
a("");
a("## Domain contract verification");
a("");
a("| Check | Result |");
a("| --- | --- |");
a("| Glob `supabase/migrations/*learning*.sql` on HEAD | 34 |");
a("| Same glob on `origin/alpha-0.2` | 34 (identical set) |");
a("| Same glob on Learning SoT worktree | 34 |");
a("| All Learning tip files contain `_learning_` in name | YES |");
a(
  "| Sample SQL creates `learning_*` tables/RPCs | YES (e.g. `20260828` -> `learning_spaces`) |"
);
a("| `docs/learning/implementation/*` cite these migration paths | YES |");
a("| `lib/learning/*.test.ts` bind to these SQL files | YES |");
a(
  "| Range `20260828-20260866` equals Learning ownership | NO (interleaved Ads/Games/Articles + missing 43) |"
);
a("");
a("## Out-of-tip Learning note (not in release expected set)");
a("");
a(
  "Additional `*learning_*` SQL exists on **unmerged** office/agent branches (not on `origin/alpha-0.2` / HEAD tip). Examples: `20260872-20260876` AI tutor thread chain, `20260901` lesson notes, `20260906/08/09` due-dates/notes hub/followthrough, bookmarks/import variants. These are **not** part of the tip Learning acceptance inventory because they are absent from the authoritative release tip trees inspected here. Remote history docs may mention `20260901+` as Learning-owned versions; ownership is not tip expected-set membership."
);
a("");
a("## LEARNING_EXPECTED_MIGRATIONS (authoritative tip set)");
a("");
a("LEARNING_EXPECTED_COUNT = 34");
a("");
a(
  "| # | MIGRATION_ID | MIGRATION_NAME | DOMAIN_OWNER | WHY_INCLUDED_IN_LEARNING_ACCEPTANCE | INTRO_COMMIT | SHA256_16 |"
);
a("| ---: | --- | --- | --- | --- | --- | --- |");
rows.forEach((r, idx) => {
  const intro = String(r.INTRO || "").replaceAll("|", " / ");
  a(
    `| ${idx + 1} | ${r.ID} | \`${r.NAME}\` | LEARNING | Filename matches \`*learning_*\`; present on HEAD+alpha tip; Learning SQL domain objects; required for tip Learning schema/RPC chain. | \`${intro}\` | \`${r.SHA16}\` |`
  );
});
a("");
a("### Flat list (machine-friendly)");
a("");
a("```");
a("LEARNING_EXPECTED_MIGRATIONS=[");
a(rows.map((r) => r.ID).join(", "));
a("]");
a("LEARNING_EXPECTED_FILES=[");
for (const r of rows) a(`  ${r.FILE}`);
a("]");
a("```");
a("");
a("## NON_LEARNING exclusions inside prior false window 20260828-20260866");
a("");
a("| MIGRATION_ID | MIGRATION_NAME | DOMAIN_OWNER | WHY_EXCLUDED |");
a("| --- | --- | --- | --- |");
a(
  "| 20260842 | ads_deliverable_binding_database_authority_v1 | ADS | Ads SQL + filename; not `*learning_*` |"
);
a(
  "| 20260843 | (no file) | OTHER/MISSING | No migration file on tip; cannot be Learning acceptance member |"
);
a(
  "| 20260846 | games_platform_foundation_v1 | GAMES | Games foundation SQL + filename; not `*learning_*` |"
);
a(
  "| 20260847 | games_catalog_foundation_v1 | GAMES | Games catalog SQL + filename; not `*learning_*` |"
);
a(
  "| 20260865 | articles_teaser_foundation_v1 | OTHER | Articles teaser foundation; header says does not alter Learning; not `*learning_*` |"
);
a("");
a("NON_LEARNING_MIGRATIONS_EXCLUDED=YES");
a("");
a("## Method (independent)");
a("");
a("1. `git fetch --prune` on workspace");
a("2. Enumerate `supabase/migrations/*.sql` on HEAD and `origin/alpha-0.2`");
a("3. Apply domain contract: include iff filename matches `*learning_*`");
a("4. Cross-check SQL content tokens / headers / created objects");
a(
  "5. Cross-check Learning docs + `lib/learning` + Games tests for ownership assertions"
);
a("6. Cross-check Learning SoT worktree file set");
a("7. Explicitly classify 42/46/47 with filename + SQL + git evidence");
a("8. Reject arbitrary numeric range construction `20260828-20260866 => 39`");
a("");
a("## Open issues / follow-ons (non-blocking for this correction artifact)");
a("");
a(
  "- Prior LB-001 POST used false EXPECTED=39 against linked project history; re-probe must use EXPECTED=34 `*learning_*` tip set."
);
a(
  "- Trio 42/46/47 alignment is an Ads/Games (or shared history) concern, **not** Learning expected-set membership."
);
a(
  "- Learning SoT worktree is behind `origin/alpha-0.2` by 58 commits; inventory parity for `*learning_*` still holds at 34."
);
a("");
a("---");
a("END PC2_A1_LEARNING_EXPECTED_SET_CORRECTION_V1");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`WROTE ${outPath} bytes=${fs.statSync(outPath).size} lines=${lines.length}`);
