import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TeamColor } from "./TeamSelector";

export interface POI {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  owner_team: string | null;
  invulnerable_until: string | null;
}

const TEAM_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  red: "#ef4444",
  green: "#22c55e",
  black: "#1e1e1e",
};

const SAINT_AMAND_CENTER = { lat: 50.4478, lng: 3.4340 };

const ZOOM_3D_THRESHOLD = 18;
const ZOOM_ROAD_VS_AREA = 14;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Build undirected edges (poi id pairs) between nearest neighbours (each POI to its 2 nearest). */
function buildEdges(pois: POI[]): [POI, POI][] {
  const edges: [POI, POI][] = [];
  const seen = new Set<string>();
  for (const a of pois) {
    const sorted = [...pois]
      .filter((p) => p.id !== a.id)
      .sort(
        (p, q) =>
          haversineMeters(a.latitude, a.longitude, p.latitude, p.longitude) -
          haversineMeters(a.latitude, a.longitude, q.latitude, q.longitude)
      );
    for (let k = 0; k < Math.min(2, sorted.length); k++) {
      const b = sorted[k]!;
      const key = [a.id, b.id].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  return edges;
}

interface WorldMapProps {
  pois: POI[];
  userTeam: TeamColor;
  onPOIClick: (poi: POI) => void;
  userPosition?: { lat: number; lng: number } | null;
}

export function WorldMap({ pois, userTeam, onPOIClick, userPosition }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const controlLayersRef = useRef<L.Polyline[]>([]);
  const [zoom, setZoom] = useState(14);

  const initMap = useCallback((el: HTMLDivElement | null) => {
    if (!el || mapInstance.current) return;

    const map = L.map(el, {
      center: [SAINT_AMAND_CENTER.lat, SAINT_AMAND_CENTER.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    ).addTo(map);

    map.on("zoomend", () => setZoom(map.getZoom()));
    setZoom(map.getZoom());

    const controlPane = map.createPane("controlArea");
    if (controlPane) controlPane.style.zIndex = "350";

    mapInstance.current = map;
    mapRef.current = el;
  }, []);

  // Area of control: segments between POIs, colored by team, halfway to next point
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    controlLayersRef.current.forEach((layer) => layer.remove());
    controlLayersRef.current = [];

    const zoomLevel = map.getZoom();
    const isRoadStyle = zoomLevel >= ZOOM_ROAD_VS_AREA;
    const weight = isRoadStyle ? 6 : 28;
    const opacity = isRoadStyle ? 0.9 : 0.45;

    const edges = buildEdges(pois);
    for (const [a, b] of edges) {
      const midLat = (a.latitude + b.latitude) / 2;
      const midLng = (a.longitude + b.longitude) / 2;
      const colorA = a.owner_team ? TEAM_COLORS[a.owner_team] ?? "#888" : "#aaa";
      const colorB = b.owner_team ? TEAM_COLORS[b.owner_team] ?? "#888" : "#aaa";

      const lineA = L.polyline(
        [
          [a.latitude, a.longitude],
          [midLat, midLng],
        ],
        { color: colorA, weight, opacity, lineCap: "round", lineJoin: "round", pane: "controlArea" }
      );
      const lineB = L.polyline(
        [
          [midLat, midLng],
          [b.latitude, b.longitude],
        ],
        { color: colorB, weight, opacity, lineCap: "round", lineJoin: "round", pane: "controlArea" }
      );
      lineA.addTo(map);
      lineB.addTo(map);
      controlLayersRef.current.push(lineA, lineB);
    }
  }, [pois, zoom]);

  // Update POI markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pois.forEach((poi) => {
      const color = poi.owner_team ? TEAM_COLORS[poi.owner_team] ?? "#888" : "#888";
      const isInvulnerable = poi.invulnerable_until && new Date(poi.invulnerable_until) > new Date();

      const marker = L.circleMarker([poi.latitude, poi.longitude], {
        radius: 14,
        color: isInvulnerable ? "#fbbf24" : color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: isInvulnerable ? 3 : 2,
      });

      marker.bindTooltip(poi.name, {
        permanent: true,
        direction: "top",
        offset: [0, -12],
        className: "poi-tooltip",
      });

      marker.on("click", () => onPOIClick(poi));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [pois, onPOIClick]);

  // User position marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !userPosition) return;
    const userMarker = L.circleMarker([userPosition.lat, userPosition.lng], {
      radius: 8,
      color: TEAM_COLORS[userTeam] ?? "#fff",
      fillColor: TEAM_COLORS[userTeam] ?? "#fff",
      fillOpacity: 1,
      weight: 3,
    });
    userMarker.bindTooltip("You", { direction: "top", offset: [0, -8] });
    userMarker.addTo(map);
    return () => {
      userMarker.remove();
    };
  }, [userPosition, userTeam]);

  const isMaxZoom = zoom >= ZOOM_3D_THRESHOLD;
  const mapWrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    overflow: "hidden",
    perspective: isMaxZoom ? "800px" : "1200px",
    transform: isMaxZoom
      ? "rotateX(28deg) scale(1.08)"
      : "rotateX(15deg) scale(1.05)",
    transformOrigin: "center bottom",
    transition: "transform 0.25s ease-out, perspective 0.25s ease-out",
  };

  return (
    <div className="relative w-full" style={{ height: "65vh" }}>
      <div style={mapWrapperStyle}>
        <div
          ref={initMap}
          className="w-full h-full rounded-xl border border-border/50"
        />
      </div>
      <style>{`
        .poi-tooltip {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          padding: 2px 6px !important;
          border-radius: 6px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        }
        .poi-tooltip::before { display: none !important; }
      `}</style>
    </div>
  );
}
