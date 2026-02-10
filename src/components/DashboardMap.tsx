import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Spot {
  id: string;
  latitude: number;
  longitude: number;
}

const DashboardMap = ({ spots }: { spots: Spot[] }) => {
  return (
    <MapContainer
      center={[30, 0]}
      zoom={1}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {spots.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.latitude, s.longitude]}
          radius={4}
          pathOptions={{
            color: "hsl(14, 100%, 55%)",
            fillColor: "hsl(14, 100%, 55%)",
            fillOpacity: 0.9,
            weight: 1,
          }}
        />
      ))}
    </MapContainer>
  );
};

export default DashboardMap;
