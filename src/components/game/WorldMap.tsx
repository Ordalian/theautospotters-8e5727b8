import { useEffect, useRef, useCallback } from "react";
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

  const initMap = useCallback((el: HTMLDivElement | null) => {
    if (!el || mapInstance.current) return;

    const map = L.map(el, {
      center: [SAINT_AMAND_CENTER.lat, SAINT_AMAND_CENTER.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    ).addTo(map);

    mapInstance.current = map;
    mapRef.current = el;
  }, []);

  // Update POI markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear old markers
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
    return () => { userMarker.remove(); };
  }, [userPosition, userTeam]);

  return (
    <div className="relative w-full" style={{ height: "65vh" }}>
      <div
        ref={initMap}
        className="w-full h-full rounded-xl overflow-hidden border border-border/50"
        style={{
          perspective: "1200px",
          transform: "rotateX(15deg) scale(1.05)",
          transformOrigin: "center bottom",
        }}
      />
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
