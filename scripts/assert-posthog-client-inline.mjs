/**
 * Fails when NEXT_PUBLIC_POSTHOG_KEY is set but the value is missing from
 * the client bundle. Next only inlines NEXT_PUBLIC_* from a literal
 * `process.env.NEXT_PUBLIC_POSTHOG_KEY` — a computed lookup ships as undefined.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const key = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "").trim();
if (!key) {
  process.exit(0);
}

const root = join(process.cwd(), ".next", "static");
if (!existsSync(root)) {
  console.error(
    "assert-posthog-client-inline: .next/static is missing. Run next build first."
  );
  process.exit(1);
}

const hits = [];

function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(js|json)$/.test(ent.name)) continue;
    if (readFileSync(path, "utf8").includes(key)) hits.push(path);
  }
}

walk(root);

if (hits.length === 0) {
  console.error(
    "assert-posthog-client-inline: NEXT_PUBLIC_POSTHOG_KEY is set but the value was not found in .next/static. Use a literal process.env.NEXT_PUBLIC_POSTHOG_KEY (not process.env[name])."
  );
  process.exit(1);
}
