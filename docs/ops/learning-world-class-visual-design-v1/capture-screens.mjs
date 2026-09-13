import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const chrome =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = path.resolve(
  "docs/ops/learning-world-class-visual-design-v1/screenshots"
);
const port = 9334;

const pages = [
  ["01-learning-home-desktop", "http://localhost:3017/learning", 1440, 900],
  ["02-learning-home-mobile", "http://localhost:3017/learning", 390, 844],
  ["03-course-page", "http://localhost:3017/learning/catalog/signals-of-thought-ai-studio", 1440, 900],
  ["04-lesson-page", "http://localhost:3017/learning/lessons/a2222222-2222-4222-8222-222222222222", 1440, 900],
  ["05-my-learning", "http://localhost:3017/learning?surface=library", 1440, 900],
  ["06-teacher-profile", "http://localhost:3017/learning/teachers/demo-teacher-nour-qamar", 1440, 900],
  ["06b-become-a-teacher", "http://localhost:3017/learning/become-a-teacher", 1440, 900],
  ["07-teacher-center", "http://localhost:3017/learning/teacher", 1440, 900],
  ["08-course-builder", "http://localhost:3017/learning/teacher/courses/new", 1440, 900],
  ["09-arabic-rtl", "http://localhost:3017/learning?hl=ar", 1440, 900],
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cdpSession(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 0;
    const pending = new Map();
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const id = ++nextId;
          return new Promise((res, rej) => {
            const timer = setTimeout(() => rej(new Error(`timeout ${method}`)), 25000);
            pending.set(id, { res, rej, timer });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      const waiter = pending.get(msg.id);
      if (!waiter) return;
      pending.delete(msg.id);
      clearTimeout(waiter.timer);
      if (msg.error) waiter.rej(new Error(JSON.stringify(msg.error)));
      else waiter.res(msg.result);
    });
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const userData = path.join(process.env.TEMP || ".", `umtuba-cdp-${Date.now()}`);
  const child = spawn(
    chrome,
    [
      `--remote-debugging-port=${port}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${userData}`,
    ],
    { stdio: "ignore" }
  );
  await wait(1800);
  for (const [name, url, width, height] of pages) {
    const created = await fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`
    ).then((r) => r.json());
    await wait(2200);
    const session = await cdpSession(created.webSocketDebuggerUrl);
    await session.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500,
    });
    await session.send("Page.enable");
    await wait(800);
    const shot = await session.send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(outDir, `${name}.png`), Buffer.from(shot.data, "base64"));
    console.log("WROTE", name);
    session.close();
  }
  child.kill();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
