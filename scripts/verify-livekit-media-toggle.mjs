/**
 * Browser-based LiveKit mic/camera toggle verification.
 * Uses Chromium fake devices on a secure localhost origin — no secrets printed.
 *
 * Usage: node scripts/verify-livekit-media-toggle.mjs
 */
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

loadEnvLocal();

const apiKey = requireEnv("LIVEKIT_API_KEY");
const apiSecret = requireEnv("LIVEKIT_API_SECRET");
const livekitUrl = requireEnv("NEXT_PUBLIC_LIVEKIT_URL");

const roomName = `umtuba-verify-toggle-${Date.now()}`;
const identity = `verify-host-${Math.random().toString(36).slice(2, 8)}`;

const at = new AccessToken(apiKey, apiSecret, {
  identity,
  name: "Verify Host",
  ttl: 60 * 5,
});
at.addGrant({
  roomJoin: true,
  room: roomName,
  canSubscribe: true,
  canPublish: true,
  canPublishData: false,
  canPublishSources: [
    TrackSource.CAMERA,
    TrackSource.MICROPHONE,
    TrackSource.SCREEN_SHARE,
    TrackSource.SCREEN_SHARE_AUDIO,
  ],
});
const token = await at.toJwt();

const livekitEsm = readFileSync(
  resolve(
    process.cwd(),
    "node_modules/livekit-client/dist/livekit-client.esm.mjs"
  )
);

const server = createServer((req, res) => {
  if (req.url === "/livekit-client.esm.mjs") {
    res.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(livekitEsm);
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html><body><p>livekit toggle harness</p></body></html>`);
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});

const context = await browser.newContext();
await context.grantPermissions(["camera", "microphone"], { origin });
const page = await context.newPage();
await page.goto(origin);

const result = await page.evaluate(
  async ({ livekitUrl: url, token: jwt }) => {
    const mod = await import("/livekit-client.esm.mjs");
    const { Room, ConnectionState } = mod;
    const room = new Room();
    const calls = { mic: [], camera: [] };

    const originalMic = room.localParticipant.setMicrophoneEnabled.bind(
      room.localParticipant
    );
    const originalCam = room.localParticipant.setCameraEnabled.bind(
      room.localParticipant
    );
    room.localParticipant.setMicrophoneEnabled = async (enabled, options) => {
      calls.mic.push(Boolean(enabled));
      return originalMic(enabled, options);
    };
    room.localParticipant.setCameraEnabled = async (enabled, options) => {
      calls.camera.push(Boolean(enabled));
      return originalCam(enabled, options);
    };

    await room.connect(url, jwt);

    const permissions = {
      canPublish: room.localParticipant.permissions?.canPublish ?? null,
      canPublishSources:
        room.localParticipant.permissions?.canPublishSources ?? null,
      state: room.state,
      connected: room.state === ConnectionState.Connected,
    };

    const trackResult = {
      mic: null,
      camera: null,
      micError: null,
      cameraError: null,
    };

    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      const micOn = room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(false);
      const micOff = !room.localParticipant.isMicrophoneEnabled;
      trackResult.mic = micOn && micOff ? "toggled" : `partial:${micOn}:${micOff}`;
    } catch (err) {
      trackResult.micError = `${err?.name || "Error"}: ${err?.message || String(err)}`;
      trackResult.mic = "threw";
    }

    try {
      await room.localParticipant.setCameraEnabled(true);
      const camOn = room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(false);
      const camOff = !room.localParticipant.isCameraEnabled;
      trackResult.camera =
        camOn && camOff ? "toggled" : `partial:${camOn}:${camOff}`;
    } catch (err) {
      trackResult.cameraError = `${err?.name || "Error"}: ${err?.message || String(err)}`;
      trackResult.camera = "threw";
    }

    await room.disconnect();
    return { permissions, calls, trackResult };
  },
  { livekitUrl, token }
);

await browser.close();
server.close();

const ok =
  result.permissions.connected === true &&
  result.permissions.canPublish === true &&
  result.calls.mic.length >= 2 &&
  result.calls.camera.length >= 2 &&
  result.trackResult.mic === "toggled" &&
  result.trackResult.camera === "toggled";

console.log(JSON.stringify({ ok, ...result }, null, 2));
if (!ok) process.exitCode = 1;
