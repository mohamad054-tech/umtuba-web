import { chromium } from "playwright";

const password = process.env.UI_GATE_PASSWORD;
const conversationId = process.env.UI_CONVERSATION_ID;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(
  `http://127.0.0.1:3000/login?next=${encodeURIComponent(`/messages?conversation=${conversationId}`)}`,
  { waitUntil: "domcontentloaded" }
);
await page.locator('input[name="email"]').fill("umstreak.ui.a@local.test");
await page.locator('input[name="password"]').fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL((url) => url.pathname.includes("/messages"), { timeout: 25000 });
await page.waitForTimeout(2500);
const buttons = await page.getByRole("button").evaluateAll((nodes) =>
  nodes.map((node) => ({
    text: (node.textContent || "").trim().slice(0, 80),
    aria: node.getAttribute("aria-label"),
  }))
);
console.log("BUTTONS=" + JSON.stringify(buttons.slice(0, 40)));
console.log("BODY_SNIP=" + (await page.locator("body").innerText()).slice(0, 500).replace(/\s+/g, " "));
await browser.close();
