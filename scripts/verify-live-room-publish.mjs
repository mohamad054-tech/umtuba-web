/**
 * Reproduce host Mic/Camera toggles on the REAL live room UI (?publish=1).
 * Uses Chromium fake devices. No secrets printed.
 */
import { chromium } from "playwright";

const roomId =
  process.env.LIVE_ROOM_ID || "db60a16b-ae73-4923-a00f-da075a41821a";
const base =
  process.env.LIVE_ROOM_URL ||
  `http://localhost:3000/live/${roomId}?publish=1`;

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
page.setDefaultTimeout(60000);

const logs = [];
page.on("console", (msg) => {
  if (["error", "warning", "log"].includes(msg.type())) {
    logs.push(`[${msg.type()}] ${msg.text()}`.slice(0, 240));
  }
});
page.on("pageerror", (err) => logs.push(`[pageerror] ${String(err)}`.slice(0, 240)));

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="live-toggle-mic"]', { timeout: 60000 });

await page.waitForFunction(() => {
  const dbg = window.__UMTUBA_LIVE_MEDIA__;
  return (
    dbg &&
    dbg.connectionState === "connected" &&
    dbg.grants &&
    dbg.grants.canPublishAudio === true &&
    dbg.grants.canPublishVideo === true
  );
});

async function clickUntil(testId, text) {
  for (let i = 0; i < 4; i++) {
    await page.getByTestId(testId).click();
    try {
      await page.waitForFunction(
        ({ id, want }) =>
          (document.querySelector(`[data-testid="${id}"]`)?.textContent || "").includes(
            want
          ),
        { id: testId, want: text },
        { timeout: 10000 }
      );
      return;
    } catch {
      // retry
    }
  }
  throw new Error(`${testId} did not show "${text}"`);
}

await clickUntil("live-toggle-camera", "Camera on");
await clickUntil("live-toggle-mic", "Mic on");

const mid = await page.evaluate(() => {
  const dbg = window.__UMTUBA_LIVE_MEDIA__;
  const videos = [...document.querySelectorAll("video")].map((v) => ({
    w: v.videoWidth,
    h: v.videoHeight,
    srcObject: Boolean(v.srcObject),
  }));
  return { dbg, videos, error: document.querySelector('[data-testid="live-media-error"]')?.textContent || null };
});

await clickUntil("live-toggle-camera", "Camera off");
await clickUntil("live-toggle-mic", "Mic off");

const end = await page.evaluate(() => ({
  mic: document.querySelector('[data-testid="live-toggle-mic"]')?.textContent,
  camera: document.querySelector('[data-testid="live-toggle-camera"]')?.textContent,
  dbg: window.__UMTUBA_LIVE_MEDIA__,
}));

await browser.close();

const ok =
  mid.dbg?.micEnabled === true &&
  mid.dbg?.cameraEnabled === true &&
  mid.videos.some((v) => v.srcObject || (v.w > 0 && v.h > 0)) &&
  end.mic?.includes("Mic off") &&
  end.camera?.includes("Camera off");

console.log(
  JSON.stringify(
    {
      ok,
      mid: {
        micEnabled: mid.dbg?.micEnabled,
        cameraEnabled: mid.dbg?.cameraEnabled,
        grants: mid.dbg?.grants,
        videos: mid.videos,
        error: mid.error,
      },
      end,
      logs: logs.slice(0, 20),
    },
    null,
    2
  )
);

if (!ok) process.exitCode = 1;
