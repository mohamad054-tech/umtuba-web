import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire("C:/Users/1/Desktop/umtuba/umtuba-web/package.json");
const { chromium } = require("playwright");

const outDir = path.resolve(
  "C:/Users/1/Desktop/umtuba/worktrees/DESKTOP-UMTUBA-PRODUCTION-HOME-SUPABASE-ENV-P0-V1/docs/ops/production-home-supabase-env-p0-v1"
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

await mkdir(path.join(outDir, "screenshots-post-deploy"), { recursive: true });

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
    await page.waitForTimeout(5000);

    const snapshot = await page.evaluate(() => {
      const text = document.body?.innerText?.slice(0, 800) ?? "";
      const html = document.documentElement?.outerHTML?.slice(0, 20000) ?? "";
      return {
        title: document.title,
        url: location.href,
        hasNextErrorId: Boolean(document.getElementById("__next_error__")),
        htmlHasNextError: html.includes("__next_error__"),
        htmlHasCouldntLoad: /couldn.t load/i.test(text),
        bodyTextHead: text.slice(0, 400),
      };
    });

    const shot = path.join(outDir, "screenshots-post-deploy", `${name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const supabaseThrow = pageErrors.some((e) =>
      /Supabase URL is not configured/i.test(e.message)
    );

    results.push({
      name,
      url,
      status: response?.status() ?? null,
      snapshot,
      supabaseThrow,
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
