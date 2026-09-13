const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("http://localhost:3000/store", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(500);
  const href = await p.getByRole("link", { name: "View product" }).first().getAttribute("href");
  console.log("href", href);
  if (!href) {
    await b.close();
    process.exit(1);
  }
  await p.goto("http://localhost:3000" + href, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(800);
  const ox = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  console.log("pdp", p.url(), "overflow", ox);
  await p.screenshot({ path: "worktrees/_store_visual_qa/recheck_1280_pdp.png" });
  await p.setViewportSize({ width: 360, height: 800 });
  await p.waitForTimeout(400);
  const ox2 = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  console.log("pdp360 overflow", ox2);
  await p.screenshot({ path: "worktrees/_store_visual_qa/recheck_360_pdp.png" });
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
