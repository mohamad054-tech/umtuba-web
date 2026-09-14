import { writeFileSync } from "node:fs";

const url = process.argv[2] || "https://umtuba.com/";
const res = await fetch(url, {
  headers: { "user-agent": "UMTUBA-PC2-source-promo-gate/1.0" },
  redirect: "follow",
});
const text = await res.text();
const build = text.match(/\/_next\/static\/([^/]+)\/(?:chunks|_buildManifest|_ssgManifest)/);
const title = text.match(/<title>([^<]+)/);
const nextError = text.includes("__next_error__");
const out = {
  url,
  status: res.status,
  ok: res.ok,
  server: res.headers.get("server"),
  location: res.headers.get("location"),
  len: text.length,
  buildId: build ? build[1] : null,
  title: title ? title[1] : null,
  nextError,
};
console.log(JSON.stringify(out, null, 2));
writeFileSync(
  new URL("./pc2-source-promo-live-home.html", import.meta.url),
  text,
  "utf8"
);
