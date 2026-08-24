import { chromium } from "playwright";

const base = process.env.LEARNING_BASE_URL ?? "http://127.0.0.1:3022";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  timeout: 20000,
  args: ["--disable-dev-shm-usage", "--no-first-run"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${base}/learning`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".learning-visual-root");

  const started = Date.now();
  await page.click('a[href="/learning/catalog/ja-18"]');
  const shellMs = await page
    .waitForSelector(".learning-visual-root", { timeout: 8000 })
    .then(() => Date.now() - started);
  const busy = await page.locator("main[aria-busy='true']").count();
  const contentMs = await page
    .waitForFunction(
      () => {
        const root = document.querySelector(".learning-visual-root");
        return (root?.textContent ?? "").replace(/\s+/g, " ").trim().length > 400;
      },
      { timeout: 15000 }
    )
    .then(() => Date.now() - started);
  const url = page.url();
  const title = await page.locator("h1").first().innerText().catch(() => "");
  console.log(
    `client_nav shell_ms=${shellMs} busy=${busy} content_ms=${contentMs} url=${url} title=${JSON.stringify(title)}`
  );
} finally {
  await browser.close();
}
