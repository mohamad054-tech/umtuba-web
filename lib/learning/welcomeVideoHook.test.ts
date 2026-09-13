import { describe, expect, it } from "vitest";
import {
  LEARNING_WELCOME_VIDEO_HOOK_ID,
  buildWelcomeVideoHook,
  shouldRenderWelcomeVideo,
} from "./welcomeVideoHook";

describe("welcome video hook", () => {
  it("stays inert and optional when no source is configured", () => {
    const hook = buildWelcomeVideoHook({});
    expect(hook.id).toBe(LEARNING_WELCOME_VIDEO_HOOK_ID);
    expect(hook.enabled).toBe(false);
    expect(hook.mandatory).toBe(false);
    expect(hook.source_url).toBeNull();
    expect(shouldRenderWelcomeVideo(hook, false)).toBe(false);
    expect(hook.destinations.become_a_teacher).toBe("/learning/become-a-teacher");
    expect(hook.destinations.learning_home).toBe("/learning");
  });

  it("enables only a valid http(s) source and remains dismissible", () => {
    const hook = buildWelcomeVideoHook({
      UMTUBA_LEARNING_WELCOME_VIDEO_URL: "https://cdn.example.com/welcome.mp4",
    });
    expect(hook.enabled).toBe(true);
    expect(shouldRenderWelcomeVideo(hook, false)).toBe(true);
    expect(shouldRenderWelcomeVideo(hook, true)).toBe(false);
    expect(
      buildWelcomeVideoHook({
        UMTUBA_LEARNING_WELCOME_VIDEO_URL: "javascript:alert(1)",
      }).enabled
    ).toBe(false);
  });
});
