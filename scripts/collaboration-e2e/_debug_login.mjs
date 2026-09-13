const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("response", async (r) => {
    if (r.url().includes("auth") || r.url().includes("token") || r.status() >= 400) {
      console.log("RESP", r.status(), r.url());
    }
  });
  const email = process.env.COLLABORATION_E2E_OWNER_EMAIL;
  const password = process.env.COLLABORATION_E2E_OWNER_PASSWORD;
  console.log("EMAIL", email);
  await page.goto("http://127.0.0.1:3000/login?next=/workspaces", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(5000);
  console.log("URL", page.url());
  const alert = await page.locator("[role=alert], .text-red, [class*=error]").allTextContents().catch(()=>[]);
  console.log("ALERTS", JSON.stringify(alert));
  const bodyText = await page.locator("body").innerText();
  console.log("BODY_SNIP", bodyText.slice(0, 800));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
