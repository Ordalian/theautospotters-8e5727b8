import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ZOOM_2KM = 14;
const SEARCH_RADIUS_KM = 50;
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

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
  const location = useLocation();
  const { user } = useAuth();
  const mapCenterFromState = (location.state as { mapCenter?: { lat: number; lng: number } | null })?.mapCenter ?? null;

  const [allSpots, setAllSpots] = useState<MapSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userCenter, setUserCenter] = useState<{ lat: number; lng: number } | null>(mapCenterFromState);
  const [focusIndex, setFocusIndex] = useState(-1);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    const fetchSpots = async () => {
      const { data: myCars } = await supabase
        .from("cars")
        .select("id, brand, model, year, latitude, longitude, location_name, image_url, user_id, created_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (myCars) {
        const userIds = [...new Set(myCars.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
        setAllSpots(
          myCars.map((c) => ({
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
    if (!user) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, [user]);

  const center = userCenter ?? mapCenterFromState ?? (allSpots[0] ? { lat: allSpots[0].latitude, lng: allSpots[0].longitude } : null);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredByText = useMemo(() => {
    if (!searchLower) return allSpots;
    return allSpots.filter(
      (s) =>
        `${s.brand} ${s.model}`.toLowerCase().includes(searchLower) ||
        s.model.toLowerCase().includes(searchLower) ||
        s.brand.toLowerCase().includes(searchLower)
    );
  }, [allSpots, searchLower]);

  const searchCenter = center ?? { lat: 48.85, lng: 2.35 };
  const filteredSpots = useMemo(() => {
    if (!searchLower) return filteredByText;
    return filteredByText.filter(
      (s) => haversineKm(searchCenter.lat, searchCenter.lng, s.latitude, s.longitude) <= SEARCH_RADIUS_KM
    );
  }, [filteredByText, searchLower, searchCenter.lat, searchCenter.lng]);

  const displaySpots = searchLower ? filteredSpots : allSpots;

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const [initLat, initLng] = center ? [center.lat, center.lng] : [30, 0];
    const map = L.map(mapRef.current, {
      center: [initLat, initLng],
      zoom: center ? ZOOM_2KM : 2,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markersRef.current = [];
    };
  }, [loading]);

  useEffect(() => {
    if (!mapInstance.current || !center) return;
    mapInstance.current.setView([center.lat, center.lng], ZOOM_2KM);
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    displaySpots.forEach((spot) => {
      const isOwn = spot.user_id === user?.id;
      const color = isOwn ? "hsl(14, 100%, 55%)" : "#3b82f6";
      const popupEl = document.createElement("div");
      popupEl.style.fontSize = "13px";
      popupEl.style.fontFamily = "sans-serif";
      const title = document.createElement("b");
      title.textContent = `${spot.brand} ${spot.model} (${spot.year})`;
      popupEl.appendChild(title);
      popupEl.appendChild(document.createElement("br"));
      const details = document.createElement("span");
      details.style.color = "#888";
      details.textContent = `${spot.username || "Anonymous"} • ${spot.location_name || "Unknown location"}`;
      popupEl.appendChild(details);
      if (spot.image_url?.startsWith("https://")) {
        popupEl.appendChild(document.createElement("br"));
        const img = document.createElement("img");
        img.src = spot.image_url;
        img.style.width = "128px";
        img.style.height = "80px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "4px";
        img.style.marginTop = "4px";
        popupEl.appendChild(img);
      }
      const marker = L.circleMarker([spot.latitude, spot.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindPopup(popupEl)
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (searchLower && filteredSpots.length > 0) {
      const bounds = L.latLngBounds(filteredSpots.map((s) => [s.latitude, s.longitude]));
      map.fitBounds(bounds.pad(0.15));
    }
  }, [displaySpots, filteredSpots, searchLower, user?.id]);

  useEffect(() => {
    if (focusIndex < 0 || focusIndex >= filteredSpots.length || !mapInstance.current) return;
    const spot = filteredSpots[focusIndex];
    mapInstance.current.setView([spot.latitude, spot.longitude], Math.max(mapInstance.current.getZoom(), 15));
    const idx = displaySpots.findIndex((s) => s.id === spot.id);
    if (idx >= 0 && markersRef.current[idx]) markersRef.current[idx].openPopup();
  }, [focusIndex, filteredSpots, displaySpots]);

  const goNext = () => {
    if (filteredSpots.length === 0) return;
    setFocusIndex((i) => (i < 0 ? 0 : (i + 1) % filteredSpots.length));
  };
  const goPrev = () => {
    if (filteredSpots.length === 0) return;
    setFocusIndex((i) => (i <= 0 ? filteredSpots.length - 1 : i - 1));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background animate-slide-in-right">
      <header className="sticky top-0 z-[1000] flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Spot Map</h1>
        <span className="ml-auto text-sm text-muted-foreground">{displaySpots.length} spots</span>
      </header>

      {!loading && (
        <div className="sticky top-14 z-[999] px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-1">
          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <Input
                placeholder="Rechercher (ex: Clio V)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusIndex(-1);
                }}
                className="pl-3 h-10 bg-secondary/30"
              />
            </div>
            {searchLower && filteredSpots.length > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goPrev} title="Point précédent">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 min-w-[3ch] text-center">
                {focusIndex < 0 ? "-" : `${focusIndex + 1}/${filteredSpots.length}`}
              </span>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goNext} title="Point suivant">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            )}
          </div>
          {searchLower && (
            <p className="text-xs text-muted-foreground">Rayon : 50 km</p>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full py-20">
            <div className="animate-pulse text-muted-foreground">Chargement de la carte...</div>
          </div>
        ) : (
          <div ref={mapRef} className="z-0 h-full w-full" />
        )}
      </div>
    </div>
  );
};

export default SpotMap;
