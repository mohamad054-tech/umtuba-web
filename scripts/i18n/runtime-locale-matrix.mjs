/**
 * Runtime HTML probe. Does not treat catalog existence as pass.
 * Usage: node scripts/i18n/runtime-locale-matrix.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://umtuba.com";
const LOCALES = [
  "ar",
  "en",
  "fr",
  "es",
  "de",
  "pt",
  "id",
  "hi",
  "ru",
  "tr",
  "zh-CN",
  "ja",
  "ko",
];
const ROUTES = [
  { id: "home", path: "/" },
  { id: "signup", path: "/signup" },
  { id: "login", path: "/login" },
  { id: "profile", path: "/profile/marenapost" },
  { id: "life", path: "/life" },
  { id: "learning", path: "/learning" },
  { id: "store", path: "/store" },
  { id: "watch", path: "/watch" },
  { id: "search", path: "/search" },
  { id: "settings", path: "/settings" },
];

const LEAKS = [
  "Creator Space",
  "Creator hub",
  "Activity tier",
  "Rising Creator",
  "activity score",
  "to go",
  "Progress to Creator",
  "Ranked by authentic contributions",
  "Joined August",
];

async function fetchRoute(locale, route) {
  const url = new URL(route.path, BASE);
  url.searchParams.set("hl", locale);
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "Accept-Language": locale },
  });
  const status = response.status;
  if (status === 307 || status === 302 || status === 303 || status === 401) {
    const location = response.headers.get("location") || "";
    if (route.id === "settings" || location.includes("login") || location.includes("signin")) {
      return { id: route.id, status, result: "BLOCKED_AUTH", leaks: [] };
    }
  }
  const html = status >= 200 && status < 400 ? await response.text() : "";
  const leaks =
    locale === "en"
      ? []
      : LEAKS.filter((phrase) => html.includes(phrase));
  return { id: route.id, status, result: leaks.length ? "FAIL" : "LIVE_PASS", leaks };
}

const rows = [];
for (const locale of LOCALES) {
  const routeResults = [];
  for (const route of ROUTES) {
    try {
      routeResults.push(await fetchRoute(locale, route));
    } catch (error) {
      routeResults.push({
        id: route.id,
        status: 0,
        result: "FAIL",
        leaks: [String(error)],
      });
    }
  }
  const profile = routeResults.find((row) => row.id === "profile");
  const settings = routeResults.find((row) => row.id === "settings");
  const failed = routeResults.filter(
    (row) => row.result === "FAIL" && row.id !== "settings"
  );
  rows.push({
    locale,
    profile: profile?.result,
    settings: settings?.result,
    leaks: profile?.leaks ?? [],
    result: failed.length ? "FAIL" : "LIVE_PASS",
    routes: routeResults,
  });
}

console.log(JSON.stringify({ base: BASE, rows }, null, 2));
