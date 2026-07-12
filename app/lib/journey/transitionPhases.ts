/**
 * Overlay phase ids for Watch → Journey (visual contract).
 * Timing is owned by the Motion Engine `watch-to-journey` definition.
 */
export type JourneyTransitionPhase =
  | "idle"
  | "pause_video"
  | "fade_ui"
  | "zoom_out_stage"
  | "morph_to_globe"
  | "navigate_handoff"
  | "complete";
