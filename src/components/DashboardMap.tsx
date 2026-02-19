import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Spot {
  id: string;
  latitude: number;
  longitude: number;
}

const ZOOM_2KM = 14;

interface DashboardMapProps {
  spots: Spot[];
  center?: { lat: number; lng: number } | null;
}

const DashboardMap = ({ spots, center }: DashboardMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const [initLat, initLng] = center ? [center.lat, center.lng] : [30, 0];
    const initZoom = center ? ZOOM_2KM : 1;

    const map = L.map(mapRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [center?.lat, center?.lng]);

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
