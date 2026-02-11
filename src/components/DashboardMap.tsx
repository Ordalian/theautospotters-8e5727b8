import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Spot {
  id: string;
  latitude: number;
  longitude: number;
}

const DashboardMap = ({ spots }: { spots: Spot[] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 1,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    spots.forEach((s) => {
      L.circleMarker([s.latitude, s.longitude], {
        radius: 4,
        color: "hsl(14, 100%, 55%)",
        fillColor: "hsl(14, 100%, 55%)",
        fillOpacity: 0.9,
        weight: 1,
      }).addTo(mapInstance.current!);
    });
  }, [spots]);

  return <div ref={mapRef} className="rounded-xl" style={{ height: "100%", width: "100%" }} />;
};

export default DashboardMap;
