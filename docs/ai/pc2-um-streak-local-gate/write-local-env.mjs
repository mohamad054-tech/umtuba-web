import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const raw = execSync("npx supabase status -o env", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const env = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx), line.slice(idx + 1).replace(/^"|"$/g, "")];
    })
);

if (!env.API_URL || !/^https?:\/\/(127\.0\.0\.1|localhost)/i.test(env.API_URL) || !env.ANON_KEY) {
  console.error("REFUSING_NON_LOCAL_OR_MISSING");
  process.exit(2);
}

const body = [
  "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000",
  `NEXT_PUBLIC_SUPABASE_URL=${env.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${env.ANON_KEY}`,
  "",
].join("\n");

writeFileSync(".env.local", body, { encoding: "utf8" });
console.log(`ENV_LOCAL_WRITTEN host=${new URL(env.API_URL).host}`);
