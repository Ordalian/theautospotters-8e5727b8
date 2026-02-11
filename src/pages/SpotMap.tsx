import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapSpot {
  id: string;
  brand: string;
  model: string;
  year: number;
  latitude: number;
  longitude: number;
  location_name: string | null;
  image_url: string | null;
  user_id: string;
  username: string | null;
}

const SpotMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchSpots = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: myCars } = await supabase
        .from("cars")
        .select("id, brand, model, year, latitude, longitude, location_name, image_url, user_id, created_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("created_at", sevenDaysAgo);

      if (myCars) {
        const userIds = [...new Set(myCars.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

        setSpots(
          myCars.map(c => ({
            ...c,
            latitude: c.latitude!,
            longitude: c.longitude!,
            username: profileMap.get(c.user_id) || null,
          }))
        );
      }
      setLoading(false);
    };
    fetchSpots();
  }, []);

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 2,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    spots.forEach((spot) => {
      const isOwn = spot.user_id === user?.id;
      const color = isOwn ? "hsl(14, 100%, 55%)" : "#3b82f6";

      L.circleMarker([spot.latitude, spot.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindPopup(
          `<div style="font-size:13px;font-family:sans-serif;">
            <b>${spot.brand} ${spot.model} (${spot.year})</b><br/>
            <span style="color:#888;">${spot.username || "Anonymous"} • ${spot.location_name || "Unknown location"}</span>
            ${spot.image_url ? `<br/><img src="${spot.image_url}" style="width:128px;height:80px;object-fit:cover;border-radius:4px;margin-top:4px;" />` : ""}
          </div>`
        )
        .addTo(map);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [loading, spots, user?.id]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-[1000]">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Spot Map</h1>
        <span className="ml-auto text-sm text-muted-foreground">{spots.length} spots</span>
      </header>

      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full py-20">
            <div className="animate-pulse text-muted-foreground">Loading map...</div>
          </div>
        ) : (
          <div ref={mapRef} className="z-0" style={{ height: "calc(100vh - 65px)", width: "100%" }} />
        )}
      </div>
    </div>
  );
};

export default SpotMap;
