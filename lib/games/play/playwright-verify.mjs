import { chromium } from "playwright";

const slugs = ["sudoku", "g2048", "snake", "memory", "xo", "hanoi"];
const base = process.env.BASE_URL || "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const results = [];

for (const slug of slugs) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });
  const response = await page.goto(`${base}/games/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-game-mounted="true"]', { timeout: 20000 });
  const mounted = await page.locator('[data-game-mounted="true"]').count();
  results.push({
    slug,
    status: response?.status() ?? 0,
    mounted,
    errors,
  });
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ base, results }, null, 2));
const failed = results.filter(
  (row) => row.status !== 200 || row.mounted < 1 || row.errors.length > 0
);
if (failed.length) {
  process.exit(1);
}
