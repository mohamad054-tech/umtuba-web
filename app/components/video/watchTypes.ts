export type WatchPanelId =
  | "comments"
  | "related"
  | "explore-city"
  | "ai"
  | "uconnect"
  | null;

export type WatchPanelRequest = {
  panel: Exclude<WatchPanelId, null>;
  videoId: string;
};
