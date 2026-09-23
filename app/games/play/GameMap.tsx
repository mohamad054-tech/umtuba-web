"use client";

import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useI18n } from "../../components/i18n";
import { resolveMapStyleUrl } from "../../../lib/world/mapStyle";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type GamePin = {
  id: string;
  lng: number;
  lat: number;
  state?: "idle" | "got";
};

type View = {
  pins: readonly GamePin[];
  focusId?: string | null;
  zoom: number;
  hideLabels: boolean;
  fit: "point" | "all";
  interactive: boolean;
};

function hasLayoutSize(node: HTMLElement) {
  return node.clientWidth > 0 && node.clientHeight > 0;
}

function hideSymbolLabels(map: MapLibreMap) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    map.setLayoutProperty(layer.id, "visibility", "none");
  }
}

export default function GameMap({
  pins,
  focusId,
  zoom = 4,
  interactive = true,
  hideLabels = false,
  fit = "point",
  onPick,
}: {
  pins: readonly GamePin[];
  focusId?: string | null;
  zoom?: number;
  interactive?: boolean;
  hideLabels?: boolean;
  fit?: "point" | "all";
  onPick?: (id: string) => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onPickRef = useRef(onPick);
  const fittedRef = useRef(false);
  const labelsHiddenRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const viewRef = useRef<View>({ pins, focusId, zoom, hideLabels, fit, interactive });
  viewRef.current = { pins, focusId, zoom, hideLabels, fit, interactive };
  onPickRef.current = onPick;
  const pinKey = pins.map((pin) => `${pin.id}:${pin.lng}:${pin.lat}:${pin.state ?? "idle"}`).join("|");

  const paint = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const view = viewRef.current;
    if (view.hideLabels && !labelsHiddenRef.current) {
      hideSymbolLabels(map);
      labelsHiddenRef.current = true;
    }
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = view.pins.map((pin) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `um-play-mappin${pin.state === "got" ? " got" : ""}`;
      button.setAttribute("data-play-item", "true");
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onPickRef.current?.(pin.id);
      });
      return new Marker({ element: button, anchor: "center" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
    });
    const focus = view.pins.find((pin) => pin.id === view.focusId) ?? view.pins[0];
    if (view.fit === "all" && view.pins.length > 1) {
      if (!fittedRef.current) {
        const lngs = view.pins.map((pin) => pin.lng);
        const lats = view.pins.map((pin) => pin.lat);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 36, maxZoom: 3.2, duration: 0 }
        );
        fittedRef.current = true;
      }
      return;
    }
    if (focus) {
      map.easeTo({ center: [focus.lng, focus.lat], zoom: view.zoom, duration: 450 });
    }
  };

  const paintRef = useRef(paint);
  paintRef.current = paint;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let frame = 0;
    let warned = false;

    const warnOnce = () => {
      if (warned) return;
      warned = true;
      console.warn("Game map failed to render");
      setFailed(true);
    };

    const create = () => {
      if (cancelled || mapRef.current || !hasLayoutSize(container)) return;
      const view = viewRef.current;
      const first = view.pins.find((pin) => pin.id === view.focusId) ?? view.pins[0];
      let map: MapLibreMap;
      try {
        map = new MapLibreMap({
          container,
          style: resolveMapStyleUrl(),
          attributionControl: false,
          cooperativeGestures: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          interactive: view.interactive,
          center: first ? [first.lng, first.lat] : [20, 20],
          zoom: view.zoom,
        });
      } catch {
        warnOnce();
        return;
      }
      mapRef.current = map;
      map.addControl(new AttributionControl({ compact: true }), "bottom-right");
      map.on("error", warnOnce);
      map.on("webglcontextlost", warnOnce);
      map.on("load", () => {
        if (cancelled) return;
        map.resize();
        paintRef.current();
      });
    };

    const wait = () => {
      if (cancelled) return;
      if (hasLayoutSize(container)) {
        create();
        return;
      }
      frame = window.requestAnimationFrame(wait);
    };
    wait();

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      fittedRef.current = false;
      labelsHiddenRef.current = false;
    };
  }, []);

  useEffect(() => {
    paintRef.current();
  }, [pinKey, focusId, zoom, fit, hideLabels]);

  return (
    <div className="um-play-gamemap" dir="ltr" data-play-item="true">
      <div ref={containerRef} className="um-play-gamemap-canvas" />
      {failed ? <p className="um-play-qtext">{t("world.map.unavailable")}</p> : null}
    </div>
  );
}
