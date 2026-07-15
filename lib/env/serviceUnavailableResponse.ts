import { NextResponse } from "next/server";
import {
  serviceUnavailableBody,
  serviceUnavailableTitle,
} from "./supabaseAuthGate";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Controlled 503 — no redirects (avoids login loops when config is broken).
 * Body never includes env values or secrets.
 */
export function createServiceUnavailableResponse(
  forPath: "protected" | "auth" | "public"
): NextResponse {
  const title = escapeHtml(serviceUnavailableTitle(forPath));
  const body = escapeHtml(serviceUnavailableBody(forPath));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · UMTUBA</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: #050510;
      color: #e8e8f0;
      padding: 24px;
    }
    main { max-width: 28rem; text-align: center; }
    h1 { font-size: 1.35rem; font-weight: 600; margin: 0 0 0.75rem; }
    p { margin: 0; line-height: 1.5; color: #a8a8b8; font-size: 0.95rem; }
    a { color: #9db7ff; text-decoration: none; display: inline-block; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="/">Back to home</a>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
