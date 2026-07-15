import fs from "node:fs";

const path = ".env.local";
if (!fs.existsSync(path)) {
  console.log("STATUS: .env.local missing");
  process.exit(0);
}

const text = fs.readFileSync(path, "utf8");
const keys = [
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
  "NEXT_PUBLIC_LIVEKIT_URL",
];

for (const key of keys) {
  const match = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  let raw = match ? match[1].trim() : "";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  const set = Boolean(raw);
  console.log(set ? `SET\t${key}\tlen=${raw.length}` : `MISSING\t${key}`);
  if (set && key.includes("URL")) {
    try {
      const u = new URL(raw);
      console.log(`\tscheme=${u.protocol}// host_prefix=${u.host.slice(0, 4)}…`);
    } catch {
      console.log("\tinvalid_url");
    }
  }
}
