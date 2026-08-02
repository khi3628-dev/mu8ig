"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Listing } from "@/lib/types";
import {
  groupListingsByComplex,
  countUnmappable,
  type ComplexGroup,
} from "@/lib/complex-groups";
import { formatManwonShort, toPyeong } from "@/lib/price";
import "leaflet/dist/leaflet.css";

// 강동구 중심 (좌표가 하나도 없을 때의 폴백)
const FALLBACK_CENTER: [number, number] = [37.5301, 127.1238];
const FALLBACK_ZOOM = 13;

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pinLabel(group: ComplexGroup): { area: string; price: string } {
  // 평형은 관행상 공급면적 기준(84m² 전용 = 34평형). 공급면적이 없을 때만 전용으로 폴백.
  const areaSource =
    group.representative.supplyArea || group.representative.exclusiveArea;
  const area = `${toPyeong(areaSource)}평`;
  const price =
    group.representativePriceManwon !== null
      ? formatManwonShort(group.representativePriceManwon)
      : group.representative.price;
  return { area, price };
}

interface ListingMapProps {
  listings: Listing[];
  onSelectComplex?: (group: ComplexGroup | null) => void;
}

export default function ListingMap({
  listings,
  onSelectComplex,
}: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const [selected, setSelected] = useState<ComplexGroup | null>(null);
  const [ready, setReady] = useState(false);

  const groups = useMemo(() => groupListingsByComplex(listings), [listings]);
  const unmappable = useMemo(() => countUnmappable(listings), [listings]);

  // 지도 초기화 (한 번만)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
        zoomControl: true,
        preferCanvas: true,
      });

      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      L.tileLayer(prefersDark ? TILES.dark : TILES.light, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  // 단지 목록이 바뀌면 핀 다시 그리기
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const layer = markerLayerRef.current;
      if (cancelled || !map || !layer) return;

      layer.clearLayers();

      for (const group of groups) {
        const { area, price } = pinLabel(group);
        const icon = L.divIcon({
          className: "listing-pin-wrapper",
          html: `
            <div class="listing-pin" title="${escapeHtml(group.complexName)}">
              <span class="listing-pin-area">${escapeHtml(area)}</span>
              <span class="listing-pin-price">${escapeHtml(price)}</span>
            </div>
            <div class="listing-pin-tail"></div>
          `,
          iconSize: [72, 56],
          iconAnchor: [36, 56],
        });

        L.marker([group.latitude, group.longitude], { icon })
          .addTo(layer)
          .on("click", () => {
            setSelected(group);
            onSelectComplex?.(group);
            map.panTo([group.latitude, group.longitude]);
          });
      }

      if (groups.length > 0) {
        const bounds = L.latLngBounds(
          groups.map((g) => [g.latitude, g.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groups, ready, onSelectComplex]);

  const closePanel = () => {
    setSelected(null);
    onSelectComplex?.(null);
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[70vh] min-h-96 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 z-0"
      />

      <div className="absolute top-3 right-3 z-[500] bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 text-xs text-zinc-600 dark:text-zinc-300 shadow-sm">
        단지 {groups.length}곳 · 매물 {listings.length}건
        {unmappable > 0 && (
          <span className="text-zinc-400"> · 좌표 없음 {unmappable}건</span>
        )}
      </div>

      {selected && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] max-h-64 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg">
          <div className="sticky top-0 flex items-start justify-between gap-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {selected.complexName}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selected.address} · 매물 {selected.listings.length}건
              </p>
            </div>
            <button
              onClick={closePanel}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm px-2"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {selected.listings.map((listing) => (
              <li
                key={listing.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {listing.tradeType}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {listing.price}
                      {listing.tradeType === "월세" && ` / ${listing.rentPrice}만`}
                    </span>
                  </div>
                  {listing.description && (
                    <p className="text-xs text-zinc-400 truncate">
                      {listing.description}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-zinc-400 shrink-0">
                  <div>전용 {listing.exclusiveArea}m²</div>
                  <div>
                    {listing.floor && `${listing.floor}층`}
                    {listing.direction && ` · ${listing.direction}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.length === 0 && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
          <p className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            지도에 표시할 매물이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
