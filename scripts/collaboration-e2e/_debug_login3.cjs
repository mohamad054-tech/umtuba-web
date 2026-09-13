const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  page.on("response", (r) => {
    if (r.url().includes("54321") || r.url().includes("auth") || r.status() >= 400)
      console.log("RESP", r.status(), r.url());
  });
  const email = process.env.COLLABORATION_E2E_OWNER_EMAIL;
  const password = process.env.COLLABORATION_E2E_OWNER_PASSWORD;
  await page.goto("http://127.0.0.1:3000/login?next=/workspaces", { waitUntil: "networkidle" });
  async function setNative(name, value) {
    await page.locator(`input[name="${name}"]`).evaluate((el, v) => {
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      desc.set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }
  await setNative("email", email);
  await setNative("password", password);
  const vals = await page.evaluate(() => ({
    email: document.querySelector('input[name="email"]').value,
    password: document.querySelector('input[name="password"]').value,
  }));
  console.log("DOM_VALS", vals);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(8000);
  console.log("URL", page.url());
  console.log("BODY", (await page.locator("body").innerText()).slice(0, 1000));
  await browser.close();
})().catch((e)=>{console.error(e); process.exit(1);});
