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
  ["welcome", "https://umtuba.com/welcome"],
  ["home-hl-en", "https://umtuba.com/?hl=en"],
  ["home-hl-ar", "https://umtuba.com/?hl=ar"],
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  timeout: 20000,
  args: ["--disable-dev-shm-usage", "--no-first-run"],
});

await mkdir(path.join(outDir, "screenshots"), { recursive: true });

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
        stack: err.stack ?? "",
      });
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(4500);

    const snapshot = await page.evaluate(() => {
      const text = document.body?.innerText?.slice(0, 4000) ?? "";
      const html = document.documentElement?.outerHTML?.slice(0, 20000) ?? "";
      const digestMatch =
        text.match(/digest[:\s]+([A-Za-z0-9]+)/i) ||
        html.match(/digest[:\s"']+([A-Za-z0-9]+)/i);
      return {
        title: document.title,
        url: location.href,
        hasNextErrorId: Boolean(document.getElementById("__next_error__")),
        bodyTextHead: text.slice(0, 600),
        digest: digestMatch?.[1] ?? null,
        htmlHasNextError: html.includes("__next_error__"),
        htmlHasCouldntLoad: /couldn.t load/i.test(text),
      };
    });

    const shot = path.join(outDir, "screenshots", `${name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    results.push({
      name,
      url,
      status: response?.status() ?? null,
      snapshot,
      pageErrors,
      screenshot: shot,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

const sanitized = results.map((row) => ({
  ...row,
  pageErrors: row.pageErrors.map((err) => ({
    message: err.message,
    stackHead: (err.stack || "").split("\n").slice(0, 8).join("\n"),
  })),
}));

await writeFile(
  path.join(outDir, "live-page-capture.json"),
  JSON.stringify(sanitized, null, 2),
  "utf8"
);
console.log(JSON.stringify(sanitized, null, 2));
