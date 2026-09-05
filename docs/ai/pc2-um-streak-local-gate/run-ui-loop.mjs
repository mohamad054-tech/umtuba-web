import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const password = process.env.UI_GATE_PASSWORD;
const conversationId = process.env.UI_CONVERSATION_ID;
if (!password || !conversationId) {
  console.error("MISSING_UI_LOOP_ENV");
  process.exit(2);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const photoPath = "docs/ai/pc2-um-streak-local-gate/local-test.png";
writeFileSync(photoPath, png);

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail: String(detail).slice(0, 200) });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${String(detail).slice(0, 160)}` : ""}`);
}

async function login(page, email, nextPath) {
  await page.goto(`http://127.0.0.1:3000/login?next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const signIn = page.getByRole("button", { name: /Sign in|تسجيل الدخول/i });
  await signIn.click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const messagesUrl = `/messages?conversation=${conversationId}`;

  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await contextA.newPage();
  await login(pageA, "umstreak.ui.a@local.test", messagesUrl);
  record("UI_A_LOGIN", pageA.url().includes("/messages"), pageA.url());

  await pageA.waitForTimeout(1500);
  const camera = pageA.getByRole("button", { name: /Open camera|افتح الكاميرا/ }).first();
  const cameraVisible = await camera.isVisible().catch(() => false);
  record("UI_A_CAMERA_ENTRY", cameraVisible);
  if (cameraVisible) {
    await camera.click();
    const library = pageA.getByRole("button", { name: /Library|المكتبة/ });
    await library.waitFor({ timeout: 10000 });
    const file = pageA.locator('input[type="file"]');
    await file.setInputFiles(photoPath);
    await pageA.getByRole("button", { name: /Send visual|أرسل الصورة/ }).click();
    await pageA.waitForTimeout(2500);
    const sendError = await pageA.locator('[role="alert"]').first().textContent().catch(() => "");
    record("UI_A_LIBRARY_SEND", !/unable|not available|cannot/i.test(sendError || ""), sendError || pageA.url());
  }

  const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageB = await contextB.newPage();
  await login(pageB, "umstreak.ui.b@local.test", messagesUrl);
  record("UI_B_LOGIN", pageB.url().includes("/messages"), pageB.url());
  await pageB.waitForTimeout(2000);
  const viewOnce = pageB.getByRole("button", { name: /View once|عرض مرة واحدة/ }).first();
  const received = await viewOnce.isVisible().catch(() => false);
  record("UI_B_RECEIVE_VIEW_ONCE", received);
  if (received) {
    await viewOnce.click();
    await pageB.waitForTimeout(1500);
    const opened = await pageB
      .getByRole("button", { name: /Opened|تم الفتح/ })
      .first()
      .isVisible()
      .catch(() => false);
    record("UI_B_OPENED_STATE", opened);
  }

  const streak = await pageB
    .getByRole("status")
    .filter({ hasText: /UM Streak|سلسلة/ })
    .first()
    .textContent()
    .catch(() => "");
  record("UI_STREAK_EXPOSED", Boolean(streak), streak || "no status");

  await browser.close();
  const failed = results.filter((row) => !row.pass);
  console.log(`UI_SUMMARY ${results.filter((row) => row.pass).length}/${results.length} passed`);
  if (failed.length) {
    console.log("UI_FAILED=" + failed.map((row) => row.name).join(","));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("UI_LOOP_CRASH", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
