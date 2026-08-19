import fs from "node:fs";

function keys(p) {
  const t = fs.readFileSync(p, "utf8");
  const s = new Set();
  for (const m of t.matchAll(/"([^"]+)":/g)) s.add(m[1]);
  return s;
}

const live = keys(
  "lib/i18n/messages/en.ts"
);
const store = keys("lib/i18n/messages/storeCatalogs.ts");
const wave = keys(
  "D:/umtuba-central/repos/_tmp-central-web-localization-wave2-v1/lib/i18n/messages/en.ts"
);
const all = new Set([...live, ...store]);
const missing = [...all].filter((k) => !wave.has(k));
console.log(
  JSON.stringify(
    {
      live_en: live.size,
      store_file: store.size,
      wave2: wave.size,
      delta: missing.length,
      missing,
    },
    null,
    2
  )
);
