/**
 * Verifies mic/camera toggles in the Next.js app origin via /live/media-lab.
 * Uses Chromium fake devices. No secrets printed.
 */
import { chromium } from "playwright";

const base = process.env.LIVE_MEDIA_LAB_URL || "http://localhost:3000/live/media-lab";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--use-fake-device-for-media-stream-labels",
  ],
});
const context = await browser.newContext({
  permissions: ["camera", "microphone"],
});
const page = await context.newPage();
page.setDefaultTimeout(45000);

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="live-toggle-mic"]');
await page.waitForFunction(
  () => (document.body?.innerText || "").includes("canPublish=true"),
  null,
  { timeout: 45000 }
);
await page.waitForFunction(
  () => (document.body?.innerText || "").includes("state=connected"),
  null,
  { timeout: 45000 }
);

const mic = page.getByTestId("live-toggle-mic");
const camera = page.getByTestId("live-toggle-camera");

async function clickUntil(label, testId, includesText) {
  for (let i = 0; i < 3; i++) {
    await page.getByTestId(testId).click();
    try {
      await page.waitForFunction(
        ({ id, text }) =>
          (document.querySelector(`[data-testid="${id}"]`)?.textContent || "").includes(
            text
          ),
        { id: testId, text: includesText },
        { timeout: 8000 }
      );
      return;
    } catch {
      // retry — first getUserMedia can race fake device init
    }
  }
  throw new Error(`${label} did not reach "${includesText}"`);
}

await clickUntil("mic on", "live-toggle-mic", "Mic on");
await clickUntil("camera on", "live-toggle-camera", "Camera on");
await clickUntil("mic off", "live-toggle-mic", "Mic off");
await clickUntil("camera off", "live-toggle-camera", "Camera off");

const finalText = {
  mic: await mic.textContent(),
  camera: await camera.textContent(),
  body: await page.locator("body").innerText(),
  consoleErrors: consoleErrors
    .filter((t) => !/Download the React DevTools/i.test(t))
    .slice(0, 10),
};

await browser.close();

const ok =
  finalText.mic?.includes("Mic off") &&
  finalText.camera?.includes("Camera off") &&
  /canPublish=true/.test(finalText.body) &&
  /state=connected/.test(finalText.body);

console.log(JSON.stringify({ ok, finalText }, null, 2));
if (!ok) process.exitCode = 1;
