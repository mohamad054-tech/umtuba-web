import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire("C:/Users/1/Desktop/umtuba/umtuba-web/package.json");
const { chromium } = require("playwright");

const outDir = path.resolve(
  "C:/Users/1/Desktop/umtuba/worktrees/CENTRAL-UMTUBA-BRAND-REBASE-SAFETY-V1/docs/ops/central-umtuba-brand-rebase-deploy-v1"
);

const pages = [
  ["home", "https://umtuba.com/"],
  ["home-hl-en", "https://umtuba.com/?hl=en"],
  ["watch", "https://umtuba.com/watch"],
  ["welcome", "https://umtuba.com/welcome"],
  ["learning", "https://umtuba.com/learning"],
  ["store", "https://umtuba.com/store"],
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  timeout: 20000,
  args: ["--disable-dev-shm-usage", "--no-first-run"],
});

await mkdir(path.join(outDir, "screenshots-live"), { recursive: true });

const results = [];

try {
  for (const [name, url] of pages) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
    });
    const page = await context.newPage();
    const pageErrors = [];

    page.on("pageerror", (err) => {
      pageErrors.push({
        message: err.message,
        stackHead: (err.stack || "").split("\n").slice(0, 8).join("\n"),
      });
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(5500);

    const snapshot = await page.evaluate(() => {
      const text = document.body?.innerText ?? "";
      const html = document.documentElement?.outerHTML ?? "";
      const imgs = Array.from(document.querySelectorAll("img")).map((img) => ({
        src: img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
      }));
      const iconHrefs = Array.from(
        document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
      ).map((el) => ({
        rel: el.getAttribute("rel") || "",
        href: el.getAttribute("href") || "",
      }));
      return {
        title: document.title,
        url: location.href,
        hasNextErrorId: Boolean(document.getElementById("__next_error__")),
        htmlHasNextError: html.includes("__next_error__"),
        htmlHasCouldntLoad: /couldn.t load/i.test(text),
        hasStackedLogo: imgs.some((img) =>
          img.src.includes("umtuba_logo_stacked_from_approved_video")
        ),
        hasSymbol: imgs.some((img) =>
          img.src.includes("umtuba_symbol_from_approved_video")
        ),
        hasLearnCreateShare: /LEARN\s*[·•]\s*CREATE\s*[·•]\s*SHARE/i.test(text),
        hasAlpha02: /Alpha\s*0\.2/i.test(text),
        hasJoinBeta: /Join\s+(the\s+)?Beta/i.test(text),
        iconHrefs,
        stackedSrcs: imgs
          .filter((img) => img.src.includes("umtuba_logo_stacked"))
          .map((img) => img.src),
        symbolSrcs: imgs
          .filter((img) => img.src.includes("umtuba_symbol"))
          .map((img) => img.src),
        bodyTextHead: text.slice(0, 600),
      };
    });

    const shot = path.join(outDir, "screenshots-live", `${name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const supabaseThrow = pageErrors.some((e) =>
      /Supabase URL is not configured/i.test(e.message)
    );
    const discoverThrow = pageErrors.some((e) =>
      /DiscoverActionRail/i.test(e.stackHead || e.message)
    );

    results.push({
      name,
      url,
      status: response?.status() ?? null,
      snapshot,
      supabaseThrow,
      discoverThrow,
      pageErrors,
      screenshot: shot,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outDir, "post-deploy-smoke.json"),
  JSON.stringify(results, null, 2),
  "utf8"
);
console.log(JSON.stringify(results, null, 2));
