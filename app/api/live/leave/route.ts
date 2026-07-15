import { NextResponse } from "next/server";
import { leaveLiveRoom } from "../../../../lib/supabase/live";
import { createClient, getServerUser } from "../../../../lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Keepalive-friendly leave endpoint for pagehide / refresh.
 * Authenticated viewers only; hosts are not force-left (End Live is explicit).
 */
export async function POST(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    let roomId = "";
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await request.json().catch(() => null)) as {
        roomId?: string;
      } | null;
      roomId = typeof json?.roomId === "string" ? json.roomId.trim() : "";
    } else {
      const text = await request.text().catch(() => "");
      try {
        const parsed = JSON.parse(text) as { roomId?: string };
        roomId = typeof parsed?.roomId === "string" ? parsed.roomId.trim() : "";
      } catch {
        roomId = "";
      }
    }

    if (!UUID_RE.test(roomId)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await leaveLiveRoom(supabase, roomId);
    if (!result.ok) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
