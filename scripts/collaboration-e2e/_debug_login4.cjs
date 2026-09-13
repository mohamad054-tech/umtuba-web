const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e)));
  page.on("response", async (r) => {
    if (r.url().includes("127.0.0.1:3000") && (r.status() >= 400 || r.request().method()==="POST")) {
      let body = "";
      try { body = (await r.text()).slice(0, 500); } catch {}
      console.log("RESP", r.status(), r.request().method(), r.url(), body.slice(0,300));
    }
  });
  const email = process.env.COLLABORATION_E2E_OWNER_EMAIL;
  const password = process.env.COLLABORATION_E2E_OWNER_PASSWORD;
  await page.goto("http://127.0.0.1:3000/login?next=/workspaces/e2e0808c-2026-4001-8000-000000000001/settings", { waitUntil: "networkidle" });
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
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(12000);
  console.log("URL", page.url());
  console.log("BODY", (await page.locator("body").innerText()).slice(0, 1500));
  await browser.close();
})().catch((e)=>{console.error(e); process.exit(1);});
