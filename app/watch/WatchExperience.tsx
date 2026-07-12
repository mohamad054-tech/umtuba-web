"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  demoVideos,
  getDemoVideoIndex,
  type DemoVideo,
} from "../data/videos";
import VerticalVideoFeed from "../components/video/VerticalVideoFeed";
import WatchAmbientBackground from "../components/video/WatchAmbientBackground";
import WatchPanel from "../components/video/WatchPanel";
import type { WatchPanelId } from "../components/video/watchTypes";

const panelCopy: Record<
  Exclude<WatchPanelId, null>,
  { title: string; description: string }
> = {
  comments: {
    title: "Comments",
    description:
      "Conversation around this moment will live here — replies, translations, and creator notes.",
  },
  related: {
    title: "Related videos",
    description:
      "More discovery from nearby places, similar moods, and creators worth following.",
  },
  "explore-city": {
    title: "Explore this city",
    description:
      "A future map of creators, places, and journeys connected to this city.",
  },
  ai: {
    title: "AI panel",
    description:
      "Summaries, translations, and creative guidance will appear here without leaving Watch.",
  },
  uconnect: {
    title: "UConnect",
    description:
      "Request a greeting, collaborate, or open a real conversation when creators allow it.",
  },
};

export default function WatchExperience() {
  const searchParams = useSearchParams();
  const stageRef = useRef<HTMLDivElement>(null);
  const initialIndex = getDemoVideoIndex(searchParams.get("id"));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<DemoVideo>(
    () => demoVideos[initialIndex] ?? demoVideos[0]
  );
  const [activePanel, setActivePanel] = useState<WatchPanelId>(null);

  const handleActiveChange = useCallback((video: DemoVideo) => {
    setActiveVideo(video);
  }, []);

  const handleOpenPanel = useCallback((panel: Exclude<WatchPanelId, null>) => {
    setActivePanel(panel);
  }, []);

  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && activePanel) {
        setActivePanel(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activePanel]);

  async function handleToggleFullscreen() {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await stage.requestFullscreen();
    } catch (error) {
      console.error("Fullscreen is not available:", error);
    }
  }

  const panelMeta = useMemo(() => {
    if (!activePanel) {
      return null;
    }

    return panelCopy[activePanel];
  }, [activePanel]);

  return (
    <main className="watch-page-enter relative min-h-screen overflow-hidden bg-[#050510] text-white md:min-h-screen">
      <WatchAmbientBackground video={activeVideo} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:pointer-events-auto md:relative md:px-8">
        <Link
          href="/"
          className="watch-focus-ring pointer-events-auto rounded-full bg-black/25 px-3 py-1 text-2xl font-black tracking-tight backdrop-blur-md md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
        >
          UMTUBA
        </Link>

        <p className="hidden max-w-md truncate text-sm text-white/50 md:block">
          {activeVideo
            ? `${activeVideo.location.city} · ${activeVideo.title}`
            : "Discover the world"}
        </p>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenPanel("related")}
            className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/10 md:inline-flex"
          >
            Related
          </button>

          <Link
            href="/feed"
            className="watch-focus-ring rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/10 md:bg-white/5"
          >
            Feed
          </Link>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/10 md:inline-flex"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl justify-center px-0 md:px-8 md:pb-8 md:pt-0">
        <div
          ref={stageRef}
          className="video-watch-stage relative h-[100dvh] w-full overflow-hidden bg-black md:mt-0 md:h-[calc(100dvh-6.5rem)] md:max-w-[510px] md:rounded-[36px] md:border md:border-white/10"
        >
          <VerticalVideoFeed
            videos={demoVideos}
            initialIndex={initialIndex}
            onActiveChange={handleActiveChange}
            onOpenPanel={handleOpenPanel}
          />

          {panelMeta ? (
            <WatchPanel
              open={Boolean(activePanel)}
              title={panelMeta.title}
              description={panelMeta.description}
              onClose={handleClosePanel}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
