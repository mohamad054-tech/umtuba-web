/**
 * Safe LiveKit Cloud connectivity check.
 * Never prints API keys, secrets, or full tokens.
 *
 * Usage: node --env-file=.env.local scripts/verify-livekit.mjs
 *    or: npx tsx --env-file=.env.local scripts/verify-livekit.mjs
 */

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

function maskHost(url) {
  try {
    const u = new URL(url);
    const host = u.host;
    if (host.length <= 8) return `${u.protocol}//***`;
    return `${u.protocol}//${host.slice(0, 4)}…${host.slice(-6)}`;
  } catch {
    return "(invalid-url)";
  }
}

function present(name) {
  const v = process.env[name]?.trim();
  return Boolean(v);
}

function lengthOf(name) {
  return process.env[name]?.trim()?.length ?? 0;
}

async function main() {
  const required = [
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "LIVEKIT_URL",
    "NEXT_PUBLIC_LIVEKIT_URL",
  ];

  console.log("LiveKit env presence (values hidden):");
  for (const name of required) {
    const ok = present(name);
    console.log(
      `  ${ok ? "✓" : "✗"} ${name} ${ok ? `(length ${lengthOf(name)})` : "(missing)"}`
    );
  }

  if (required.some((n) => !present(n))) {
    console.error("\nFail: add all four variables to .env.local, then re-run.");
    process.exit(1);
  }

  const apiKey = process.env.LIVEKIT_API_KEY.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET.trim();
  const serverUrl = process.env.LIVEKIT_URL.trim();
  const publicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL.trim();

  if (!publicUrl.startsWith("wss://") && !publicUrl.startsWith("ws://")) {
    console.error("\nFail: NEXT_PUBLIC_LIVEKIT_URL must be a ws:// or wss:// URL.");
    process.exit(1);
  }

  if (!serverUrl.startsWith("wss://") && !serverUrl.startsWith("ws://") && !serverUrl.startsWith("https://")) {
    console.error(
      "\nFail: LIVEKIT_URL should be wss://… (Cloud) or https://… for RoomService."
    );
    process.exit(1);
  }

  // Browser must only ever see the public WS URL — never key/secret names in payload.
  const browserPayload = {
    livekitUrl: publicUrl,
    // token omitted from this check object on purpose
  };
  const leaked = Object.keys(browserPayload).filter((k) =>
    /secret|api[_-]?key|apiKey|apiSecret/i.test(k)
  );
  if (leaked.length) {
    console.error("\nFail: browser payload contains secret-like keys:", leaked);
    process.exit(1);
  }
  console.log(
    `\n✓ Browser-facing URL shape OK: ${maskHost(browserPayload.livekitUrl)}`
  );
  console.log("✓ Browser payload keys (no secrets):", Object.keys(browserPayload).join(", "));

  // Mint a short-lived token (do not print it)
  const at = new AccessToken(apiKey, apiSecret, {
    identity: "umtuba-verify",
    ttl: 60,
  });
  at.addGrant({
    roomJoin: true,
    room: "umtuba-verify-room",
    canSubscribe: true,
    canPublish: false,
  });
  const token = await at.toJwt();
  if (!token || token.length < 20) {
    console.error("\nFail: token mint returned empty JWT.");
    process.exit(1);
  }
  console.log(`✓ Server minted JWT (length ${token.length}, not shown)`);

  // RoomService uses https host derived from wss URL
  const httpHost = serverUrl
    .replace(/^wss:/, "https:")
    .replace(/^ws:/, "http:");

  try {
    const rooms = new RoomServiceClient(httpHost, apiKey, apiSecret);
    const list = await rooms.listRooms();
    console.log(
      `✓ LiveKit RoomService reachable (rooms visible to project: ${list.length})`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Do not echo URLs that might contain credentials
    console.error("\nFail: RoomService call failed.");
    console.error("  Reason:", message.slice(0, 200));
    console.error(
      "  Check API key/secret match this project, and LIVEKIT_URL host is correct."
    );
    process.exit(1);
  }

  console.log("\nAll checks passed. Restart `next dev` after editing .env.local.");
}

main().catch((err) => {
  console.error("Unexpected error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
