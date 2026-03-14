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
  image_url?: string | null;
}

const TEAM_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  red: "#ef4444",
  green: "#22c55e",
  purple: "#a855f7",
};

const SAINT_AMAND_CENTER = { lat: 50.4478, lng: 3.4340 };

const ZOOM_LABELS_VISIBLE = 14;
const ZOOM_ROAD_VS_AREA = 14;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/** Fetch road geometry between two points (coordinates as [lat, lng]). Returns Leaflet [lat, lng][] or null. */
async function fetchRouteGeometry(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<[number, number][] | null> {
  const coords = `${lng1},${lat1};${lng2},${lat2}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coordsGeo = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordsGeo) || coordsGeo.length < 2) return null;
    return coordsGeo.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  } catch {
    return null;
  }
}

/** Split path at midpoint by distance; returns two segments for team coloring. */
function splitPathAtMidpoint(path: [number, number][]): { first: [number, number][]; second: [number, number][] } {
  if (path.length <= 2) {
    const mid = Math.floor(path.length / 2);
    return { first: path.slice(0, mid + 1), second: path.slice(mid) };
  }
  const dists: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const [latA, lngA] = path[i - 1]!;
    const [latB, lngB] = path[i]!;
    dists.push(dists[i - 1]! + haversineMeters(latA, lngA, latB, lngB));
  }
  const total = dists[dists.length - 1] ?? 0;
  const half = total / 2;
  let idx = 0;
  while (idx < dists.length - 1 && (dists[idx + 1] ?? 0) < half) idx++;
  return {
    first: path.slice(0, idx + 1),
    second: path.slice(idx),
  };
}

interface WorldMapProps {
  pois: POI[];
  userTeam: TeamColor;
  onPOIClick: (poi: POI) => void;
  userPosition?: { lat: number; lng: number } | null;
}

function edgeKey(a: POI, b: POI): string {
  return [a.id, b.id].sort().join("-");
}

export function WorldMap({ pois, userTeam, onPOIClick, userPosition }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const controlLayersRef = useRef<L.Polyline[]>([]);
  const roadGeometriesRef = useRef<Map<string, [number, number][]>>(new Map());
  const fetchGenerationRef = useRef(0);
  const [zoom, setZoom] = useState(14);
  const [roadGeometriesVersion, setRoadGeometriesVersion] = useState(0);

  const initMap = useCallback((el: HTMLDivElement | null) => {
    if (!el || mapInstance.current) return;

    const map = L.map(el, {
      center: [SAINT_AMAND_CENTER.lat, SAINT_AMAND_CENTER.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // Light map tiles
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

  // Area of control segments (straight or road-following)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    controlLayersRef.current.forEach((layer) => layer.remove());
    controlLayersRef.current = [];

    const zoomLevel = map.getZoom();
    const isZoomedIn = zoomLevel >= ZOOM_ROAD_VS_AREA;
    const weight = isZoomedIn ? 18 : 32;
    const opacity = isZoomedIn ? 0.7 : 0.4;
    const opts = { weight, opacity, lineCap: "round" as const, lineJoin: "round" as const, pane: "controlArea" };

    const edges = buildEdges(pois);
    for (const [a, b] of edges) {
      const colorA = a.owner_team ? TEAM_COLORS[a.owner_team] ?? "#888" : "#444";
      const colorB = b.owner_team ? TEAM_COLORS[b.owner_team] ?? "#888" : "#444";
      const key = edgeKey(a, b);
      const roadPath = roadGeometriesRef.current.get(key);

      if (roadPath && roadPath.length >= 2) {
        const { first, second } = splitPathAtMidpoint(roadPath);
        const lineA = L.polyline(first, { ...opts, color: colorA });
        const lineB = L.polyline(second, { ...opts, color: colorB });
        lineA.addTo(map);
        lineB.addTo(map);
        controlLayersRef.current.push(lineA, lineB);
      } else {
        const midLat = (a.latitude + b.latitude) / 2;
        const midLng = (a.longitude + b.longitude) / 2;
        const lineA = L.polyline([[a.latitude, a.longitude], [midLat, midLng]], { ...opts, color: colorA });
        const lineB = L.polyline([[midLat, midLng], [b.latitude, b.longitude]], { ...opts, color: colorB });
        lineA.addTo(map);
        lineB.addTo(map);
        controlLayersRef.current.push(lineA, lineB);
      }
    }

    // Fetch road geometries (OSRM, ~1 req/s) and redraw when ready
    if (edges.length === 0) return;
    fetchGenerationRef.current += 1;
    const gen = fetchGenerationRef.current;
    (async () => {
      const next = new Map(roadGeometriesRef.current);
      for (const [a, b] of edges) {
        if (gen !== fetchGenerationRef.current) return;
        const key = edgeKey(a, b);
        const geom = await fetchRouteGeometry(a.latitude, a.longitude, b.latitude, b.longitude);
        if (gen !== fetchGenerationRef.current) return;
        if (geom) next.set(key, geom);
        await new Promise((r) => setTimeout(r, 1100));
      }
      if (gen !== fetchGenerationRef.current) return;
      roadGeometriesRef.current = next;
      setRoadGeometriesVersion((v) => v + 1);
    })();
  }, [pois, zoom, roadGeometriesVersion]);

  // POI markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const showLabels = zoom >= ZOOM_LABELS_VISIBLE;

    pois.forEach((poi) => {
      const color = poi.owner_team ? TEAM_COLORS[poi.owner_team] ?? "#888" : "#666";
      const isInvulnerable = poi.invulnerable_until && new Date(poi.invulnerable_until) > new Date();

      const marker = L.circleMarker([poi.latitude, poi.longitude], {
        radius: 14,
        color: isInvulnerable ? "#fbbf24" : color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: isInvulnerable ? 3 : 2,
      });

      marker.bindTooltip(poi.name, {
        permanent: showLabels,
        direction: "top",
        offset: [0, -12],
        className: "poi-tooltip",
      });

      marker.on("click", () => onPOIClick(poi));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [pois, onPOIClick, zoom]);

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
    return () => { userMarker.remove(); };
  }, [userPosition, userTeam]);

  const mapWrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    overflow: "hidden",
  };

  return (
    <div className="relative w-full" style={{ height: "65vh" }}>
      <div style={mapWrapperStyle}>
        <div
          ref={initMap}
          className="w-full h-full rounded-xl"
        />
      </div>
      <style>{`
        .poi-tooltip {
          background: hsl(var(--glass)) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid hsl(var(--glass-border)) !important;
          color: hsl(var(--foreground)) !important;
          font-family: 'Barlow Condensed', sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding: 3px 8px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
        }
        .poi-tooltip::before { display: none !important; }
      `}</style>
    </div>
  );
}