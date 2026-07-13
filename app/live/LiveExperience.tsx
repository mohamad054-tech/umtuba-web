"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import LiveChatPanel from "./components/LiveChatPanel";
import LiveCreatorBar from "./components/LiveCreatorBar";
import LiveReactionsBar from "./components/LiveReactionsBar";
import LiveShell from "./components/LiveShell";
import LiveStreamControls from "./components/LiveStreamControls";
import LiveStreamMeta from "./components/LiveStreamMeta";
import LiveStreamStage from "./components/LiveStreamStage";
import OtherLiveStreams from "./components/OtherLiveStreams";
import {
  FEATURED_STREAM_ID,
  MOCK_LIVE_STREAMS,
  getStreamById,
  type LiveChatMessage,
  type LiveQuality,
  type LiveStream,
} from "./data/mockStreams";

type FloatingReaction = {
  id: string;
  emoji: string;
};

function resolveInitialStreamId(streamParam: string | null) {
  if (streamParam && getStreamById(streamParam)) {
    return streamParam;
  }
  return FEATURED_STREAM_ID;
}

type LiveExperienceInnerProps = {
  initialStreamId: string;
};

function LiveExperienceInner({ initialStreamId }: LiveExperienceInnerProps) {
  const [activeId, setActiveId] = useState(initialStreamId);
  const [streams, setStreams] = useState<LiveStream[]>(MOCK_LIVE_STREAMS);
  const [isFollowing, setIsFollowing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [quality, setQuality] = useState<LiveQuality>("Auto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    FloatingReaction[]
  >([]);

  const stageRef = useRef<HTMLDivElement>(null);

  const activeStream =
    streams.find((stream) => stream.id === activeId) ?? streams[0];

  const otherStreams = streams.filter((stream) => stream.id !== activeId);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleSelectStream = useCallback((id: string) => {
    setActiveId(id);
    setIsFollowing(false);
    setReportSent(false);
    setShareCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function handleSendChat(text: string) {
    const newMessage: LiveChatMessage = {
      id: `local-${Date.now()}`,
      userId: "me",
      userName: "You",
      userInitials: "YO",
      avatarGradient: "from-white/80 to-white/40",
      text,
      sentAt: "now",
    };

    setStreams((prev) =>
      prev.map((stream) =>
        stream.id === activeId
          ? { ...stream, chat: [...stream.chat, newMessage] }
          : stream,
      ),
    );
  }

  function handleReact(emoji: string) {
    const id = `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setFloatingReactions((prev) => [...prev.slice(-5), { id, emoji }]);
    window.setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
    }, 1100);
  }

  async function handleToggleFullscreen() {
    const stage = stageRef.current;
    if (!stage) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await stage.requestFullscreen();
  }

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/live?stream=${activeId}`
        : `/live?stream=${activeId}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Prototype: ignore clipboard failures.
    }

    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2000);
  }

  return (
    <LiveShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <LiveStreamStage
            stream={activeStream}
            muted={muted}
            captionsOn={captionsOn}
            quality={quality}
            isFullscreen={isFullscreen}
            stageRef={stageRef}
          />

          <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/70 p-4 backdrop-blur-xl md:rounded-[32px] md:p-5">
            <LiveCreatorBar
              creator={activeStream.creator}
              city={activeStream.city}
              country={activeStream.country}
              startedAtLabel={activeStream.startedAtLabel}
              isFollowing={isFollowing}
              onToggleFollow={() => setIsFollowing((prev) => !prev)}
            />

            <LiveStreamMeta stream={activeStream} />

            <LiveReactionsBar
              onReact={handleReact}
              floatingReactions={floatingReactions}
            />

            <LiveStreamControls
              muted={muted}
              captionsOn={captionsOn}
              quality={quality}
              isFullscreen={isFullscreen}
              shareCopied={shareCopied}
              reportSent={reportSent}
              onToggleMute={() => setMuted((prev) => !prev)}
              onToggleCaptions={() => setCaptionsOn((prev) => !prev)}
              onQualityChange={setQuality}
              onToggleFullscreen={() => {
                void handleToggleFullscreen();
              }}
              onShare={() => {
                void handleShare();
              }}
              onReport={() => setReportSent(true)}
            />
          </div>
        </section>

        <div className="min-h-[28rem] lg:min-h-0 lg:h-[calc(100vh-8.5rem)] lg:sticky lg:top-24">
          <LiveChatPanel
            messages={activeStream.chat}
            onSend={handleSendChat}
          />
        </div>
      </div>

      <div className="mt-5 md:mt-6">
        <OtherLiveStreams
          streams={otherStreams}
          activeId={activeId}
          onSelect={handleSelectStream}
        />
      </div>
    </LiveShell>
  );
}

export default function LiveExperience() {
  const searchParams = useSearchParams();
  const streamParam = searchParams.get("stream");
  const initialStreamId = resolveInitialStreamId(streamParam);

  return (
    <LiveExperienceInner
      key={initialStreamId}
      initialStreamId={initialStreamId}
    />
  );
}
