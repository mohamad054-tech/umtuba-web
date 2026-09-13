const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const email = process.env.COLLABORATION_E2E_OWNER_EMAIL;
  const password = process.env.COLLABORATION_E2E_OWNER_PASSWORD;
  await page.goto("http://127.0.0.1:3000/login?next=/workspaces", { waitUntil: "domcontentloaded" });
  for (const [name, value] of [["email", email], ["password", password]]) {
    const input = page.locator(`input[name="${name}"]`);
    await input.click();
    await input.fill("");
    await input.pressSequentially(value, { delay: 5 });
  }
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45000 });
  console.log("URL", page.url());
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
