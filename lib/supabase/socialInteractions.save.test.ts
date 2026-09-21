import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapToggleSaveRpcError,
  parseSocialRpcJson,
  togglePostSave,
} from "./socialInteractions";

function rpcClient(result: { data?: unknown; error?: { message: string } | null }) {
  return {
    rpc: vi.fn(async () => result),
  } as unknown as SupabaseClient;
}

describe("toggle save RPC payload + errors", () => {
  it("unwraps a jsonb object and a one-element array", () => {
    expect(parseSocialRpcJson({ saved: true, saves: 4 })).toEqual({
      saved: true,
      saves: 4,
    });
    expect(parseSocialRpcJson([{ saved: false, saves: "3" }])).toEqual({
      saved: false,
      saves: "3",
    });
    expect(parseSocialRpcJson([])).toBeNull();
    expect(parseSocialRpcJson(null)).toBeNull();
  });

  it("maps auth and generic save failures to a visible message", () => {
    expect(mapToggleSaveRpcError("Authentication required")).toEqual({
      ok: false,
      message: "Please sign in to save this video.",
      requiresAuth: true,
    });
    expect(mapToggleSaveRpcError("permission denied for function create_notification")).toEqual({
      ok: false,
      message: "Unable to save this video. Please try again.",
    });
    expect(mapToggleSaveRpcError("Post not found")).toEqual({
      ok: false,
      message: "This video cannot be saved.",
    });
  });

  it("returns saved state from toggle_post_save", async () => {
    const supabase = rpcClient({
      data: [{ saved: true, saves: "12" }],
      error: null,
    });

    await expect(togglePostSave(supabase, 77)).resolves.toEqual({
      ok: true,
      saved: true,
      saves: 12,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("toggle_post_save", {
      p_post_id: 77,
    });
  });

  it("does not treat a permission error as success", async () => {
    const supabase = rpcClient({
      data: null,
      error: {
        message: "permission denied for function um_points_config_value",
      },
    });

    await expect(togglePostSave(supabase, 77)).resolves.toEqual({
      ok: false,
      message: "Unable to save this video. Please try again.",
    });
  });
});
