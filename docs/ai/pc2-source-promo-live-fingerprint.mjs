const urls = [
  "https://umtuba.com/",
  "https://umtuba.com/welcome",
  "https://umtuba.com/watch",
  "https://umtuba.com/life",
  "https://umtuba.com/messages",
  "https://umtuba.com/settings",
  "https://umtuba.com/learning",
  "https://umtuba.com/store",
  "https://umtuba.com/?hl=ar",
];

const headers = { "user-agent": "UMTUBA-PC2-source-promo-gate/1.0" };

function fingerprint(text) {
  const title = (text.match(/<title>([^<]+)/) || [])[1] || null;
  const buildId =
    (text.match(/"buildId":"([^"]+)"/) ||
      text.match(/\/_next\/static\/([A-Za-z0-9_-]{8,})\/_buildManifest/) ||
      [])[1] || null;
  return {
    title,
    buildId,
    len: text.length,
    nextError: text.includes("__next_error__"),
    dirRtl: /dir=["']rtl["']/.test(text) || /lang=["']ar["']/.test(text),
    umLife: /UM Life|um-life|\/life/.test(text),
    nightMarket: /#06101f|#6a4cff/.test(text),
    brandApprovedVideo: /umtuba_symbol_from_approved_video/.test(text),
  };
}

const rows = [];
for (const url of urls) {
  const res = await fetch(url, { headers, redirect: "manual" });
  const loc = res.headers.get("location");
  let text = "";
  if (res.status >= 200 && res.status < 400 && !loc) {
    text = await res.text();
  }
  rows.push({
    url,
    status: res.status,
    server: res.headers.get("server"),
    location: loc,
    ...fingerprint(text),
  });
}
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), rows }, null, 2));
