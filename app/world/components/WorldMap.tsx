"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslation } from "../../components/i18n";
import {
  collectWorldMapPoints,
  worldMapHref,
  type WorldMapCenter,
  type WorldMapPoint,
} from "../../../lib/world/mapPoints";
import { resolveMapStyleUrl } from "../../../lib/world/mapStyle";

export type WorldMapProps = {
  points: WorldMapPoint[];
  center?: WorldMapCenter | null;
  zoom?: number;
  onError?: () => void;
};

type Overlay = {
  name: string;
  category: string;
  href: string;
  kind: WorldMapPoint["kind"];
};

type GeoJsonFeature = {
  type: "Feature";
  properties: Overlay & { id: string };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

const SOURCE_ID = "world-map-points";
const CLUSTER_LAYER = "world-map-clusters";
const CLUSTER_COUNT_LAYER = "world-map-cluster-count";
const POINT_LAYER = "world-map-unclustered";

function toFeatureCollection(points: WorldMapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map(
      (point): GeoJsonFeature => ({
        type: "Feature",
        properties: {
          id: point.id,
          name: point.name,
          category: point.category,
          href: worldMapHref(point),
          kind: point.kind,
        },
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
      })
    ),
  };
}

function fitMap(
  map: MapLibreMap,
  points: WorldMapPoint[],
  center: WorldMapCenter | null | undefined,
  zoom: number | undefined
) {
  if (center) {
    map.jumpTo({
      center: [center.longitude, center.latitude],
      zoom: zoom ?? (points.length <= 1 ? 12 : 10),
    });
    return;
  }
  if (points.length > 1) {
    const bounds = new LngLatBounds();
    for (const point of points) {
      bounds.extend([point.longitude, point.latitude]);
    }
    map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
    return;
  }
  if (points.length === 1) {
    map.jumpTo({
      center: [points[0].longitude, points[0].latitude],
      zoom: zoom ?? 12,
    });
    return;
  }
  map.jumpTo({ center: [20, 15], zoom: 1.4 });
}

function readOverlay(properties: GeoJsonFeature["properties"] | undefined): Overlay | null {
  if (!properties) return null;
  const href = String(properties.href ?? "");
  const name = String(properties.name ?? "");
  if (!href || !name) return null;
  return {
    name,
    category: String(properties.category ?? ""),
    href,
    kind: properties.kind === "city" ? "city" : "place",
  };
}

export default function WorldMap({
  points,
  center = null,
  zoom,
  onError,
}: WorldMapProps) {
  const { t, direction } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onErrorRef = useRef(onError);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const safePoints = useMemo(() => collectWorldMapPoints(points), [points]);
  const visibleOverlay =
    overlay &&
    safePoints.some((point) => worldMapHref(point) === overlay.href)
      ? overlay
      : null;

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: resolveMapStyleUrl(),
        attributionControl: false,
        cooperativeGestures: true,
        center: center ? [center.longitude, center.latitude] : [20, 15],
        zoom: zoom ?? (center ? 11 : 1.4),
      });
    } catch {
      onErrorRef.current?.();
      return;
    }

    const controlPosition = direction === "rtl" ? "top-left" : "top-right";
    map.addControl(
      new NavigationControl({ showCompass: false }),
      controlPosition
    );
    map.addControl(
      new AttributionControl({ compact: true }),
      "bottom-right"
    );

    const fail = () => onErrorRef.current?.();
    map.on("error", fail);

    const applyData = () => {
      const collection = toFeatureCollection(safePoints);
      const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(collection);
        fitMap(map, safePoints, center, zoom);
        return;
      }
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: collection,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#22d3ee",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 26],
          "circle-opacity": 0.88,
        },
      });
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#041018",
        },
      });
      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#67e8f9",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#082f49",
        },
      });
      fitMap(map, safePoints, center, zoom);
    };

    map.on("load", applyData);

    map.on("click", CLUSTER_LAYER, (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (typeof clusterId !== "number" || !source || !feature?.geometry) return;
      if (feature.geometry.type !== "Point") return;
      const coordinates = feature.geometry.coordinates as [number, number];
      void source.getClusterExpansionZoom(clusterId).then((nextZoom: number) => {
        map.easeTo({ center: coordinates, zoom: nextZoom });
      });
    });

    map.on("click", POINT_LAYER, (event: MapLayerMouseEvent) => {
      const next = readOverlay(
        event.features?.[0]?.properties as GeoJsonFeature["properties"] | undefined
      );
      setOverlay(next);
    });

    const pointer = (cursor: string) => {
      map.getCanvas().style.cursor = cursor;
    };
    map.on("mouseenter", CLUSTER_LAYER, () => pointer("pointer"));
    map.on("mouseleave", CLUSTER_LAYER, () => pointer(""));
    map.on("mouseenter", POINT_LAYER, () => pointer("pointer"));
    map.on("mouseleave", POINT_LAYER, () => pointer(""));

    mapRef.current = map;
    return () => {
      map.off("error", fail);
      map.remove();
      mapRef.current = null;
    };
    // Map instance is created once; data updates use the source effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(toFeatureCollection(safePoints));
    fitMap(map, safePoints, center, zoom);
  }, [safePoints, center, zoom]);

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-2xl md:h-80">
      <div
        ref={containerRef}
        dir="ltr"
        className="h-full w-full"
        role="presentation"
        aria-label={t("world.map.pointsLabel")}
      />
      {visibleOverlay ? (
        <div
          dir={direction}
          className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-white/15 bg-[#050510]/95 p-3 text-start shadow-lg"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
            {visibleOverlay.category}
          </p>
          <p className="mt-1 text-sm font-black text-white">{visibleOverlay.name}</p>
          <a
            href={visibleOverlay.href}
            className="mt-2 inline-flex text-xs font-bold text-cyan-100 hover:underline"
          >
            {visibleOverlay.kind === "city"
              ? t("world.map.openCity")
              : t("world.map.openPlace")}
          </a>
        </div>
      ) : null}
    </div>
  );
}
