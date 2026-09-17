"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "../../components/i18n";
import type { WorldMapCenter, WorldMapPoint } from "../../../lib/world/mapPoints";

type Props = {
  points: WorldMapPoint[];
  center?: WorldMapCenter | null;
  zoom?: number;
  collapsible?: boolean;
};

function MapUnavailable({ message }: { message: string }) {
  return (
    <p role="status" className="text-xs text-white/45">
      {message}
    </p>
  );
}

function WorldMapImportFailed({ onError }: { onError?: () => void }) {
  useEffect(() => {
    onError?.();
  }, [onError]);
  return null;
}

const WorldMap = dynamic(
  () =>
    import("./WorldMap").catch(() => ({
      default: WorldMapImportFailed,
    })),
  { ssr: false, loading: () => null }
);

class MapErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function WorldMapSection({
  points,
  center = null,
  zoom,
  collapsible = false,
}: Props) {
  const { t, direction } = useTranslation();
  const hostRef = useRef<HTMLElement | null>(null);
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === "undefined"
  );
  const [expanded, setExpanded] = useState(true);
  const [failed, setFailed] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const node = hostRef.current;
    if (!node || nearViewport) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded, nearViewport]);

  const showToggle = collapsible && narrow;
  const showMap = (!showToggle || expanded) && !failed;
  const fallback = <MapUnavailable message={t("world.map.unavailable")} />;

  return (
    <section
      ref={hostRef}
      dir={direction}
      aria-label={t("world.map.title")}
      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-white">{t("world.map.title")}</h2>
        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1 text-xs font-bold"
          >
            {expanded ? t("world.map.hide") : t("world.map.show")}
          </button>
        ) : null}
      </div>
      {showMap ? (
        <div className="mt-3">
          {nearViewport ? (
            <MapErrorBoundary fallback={fallback} onError={() => setFailed(true)}>
              <WorldMap
                points={points}
                center={center}
                zoom={zoom}
                onError={() => setFailed(true)}
              />
            </MapErrorBoundary>
          ) : (
            <div className="h-56 rounded-2xl bg-black/20 md:h-80" aria-hidden />
          )}
        </div>
      ) : failed ? (
        <div className="mt-3">{fallback}</div>
      ) : null}
      {showMap ? (
        <p className="mt-2 text-[11px] leading-5 text-white/40">
          {t("world.map.attribution")}
        </p>
      ) : null}
    </section>
  );
}
