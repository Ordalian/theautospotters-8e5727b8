import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ChevronRight, ChevronLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  location_precision: string | null;
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
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userCenter, setUserCenter] = useState<{ lat: number; lng: number } | null>(mapCenterFromState);
  const [focusIndex, setFocusIndex] = useState(-1);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<(L.CircleMarker | L.Marker)[]>([]);

  useEffect(() => {
    const fetchSpots = async () => {
      const { data: myCars } = await (supabase
        .from("cars")
        .select("id, brand, model, year, latitude, longitude, location_name, location_precision, image_url, user_id, created_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null) as any) as { data: any[] | null };

      let friendIdSet = new Set<string>();
      if (user) {
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
        if (friendships) {
          friendships.forEach((f) => {
            const other = f.requester_id === user.id ? f.addressee_id : f.requester_id;
            friendIdSet.add(other);
          });
        }
        setFriendIds(friendIdSet);
      }

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
            location_precision: c.location_precision ?? "precise",
            username: profileMap.get(c.user_id) || null,
          }))
        );
      }
      setLoading(false);
    };
    fetchSpots();
  }, [user?.id]);

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
      zoomControl: false,
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

    const isFriend = (uid: string) => friendIds.has(uid);
    const getColor = (spot: MapSpot) => {
      if (spot.user_id === user?.id) return "#dc2626"; // red — mes spots
      if (isFriend(spot.user_id)) return "#16a34a"; // green — amis
      return "#2563eb"; // blue — non amis
    };

    displaySpots.forEach((spot) => {
      const color = getColor(spot);
      const isPrecise = spot.location_precision !== "general";
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

      if (isPrecise) {
        const marker = L.circleMarker([spot.latitude, spot.longitude], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(popupEl)
          .addTo(map);
        markersRef.current.push(marker);
      } else {
        const size = 10;
        const icon = L.divIcon({
          className: "spot-marker-square",
          html: `<div style="width:${size * 2}px;height:${size * 2}px;background:${color};border:2px solid #fff;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [size * 2, size * 2],
          iconAnchor: [size, size],
        });
        const marker = L.marker([spot.latitude, spot.longitude], { icon })
          .bindPopup(popupEl)
          .addTo(map);
        markersRef.current.push(marker);
      }
    });

    if (searchLower && filteredSpots.length > 0) {
      const bounds = L.latLngBounds(filteredSpots.map((s) => [s.latitude, s.longitude]));
      map.fitBounds(bounds.pad(0.15));
    }
  }, [displaySpots, filteredSpots, searchLower, user?.id, friendIds]);

  useEffect(() => {
    if (focusIndex < 0 || focusIndex >= filteredSpots.length || !mapInstance.current) return;
    const spot = filteredSpots[focusIndex];
    mapInstance.current.setView([spot.latitude, spot.longitude], Math.max(mapInstance.current.getZoom(), 15));
    const idx = displaySpots.findIndex((s) => s.id === spot.id);
    if (idx >= 0 && markersRef.current[idx]) (markersRef.current[idx] as L.Marker).openPopup?.();
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
        <div className="sticky top-14 z-[999] px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-2">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => mapInstance.current?.zoomOut()}
                aria-label="Zoom arrière"
              >
                −
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => mapInstance.current?.zoomIn()}
                aria-label="Zoom avant"
              >
                +
              </Button>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full shadow-lg shadow-primary/50 ring-2 ring-primary/30 hover:ring-primary/50 hover:shadow-primary/60 transition-all"
                  aria-label="Légende"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Légende de la carte</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-muted-foreground">Couleurs</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#dc2626] shrink-0" />
                      <span>Mes spots</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#16a34a] shrink-0" />
                      <span>Spots des amis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#2563eb] shrink-0" />
                      <span>Spots de la communauté</span>
                    </li>
                  </ul>
                  <p className="font-medium text-muted-foreground pt-2">Formes</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-muted-foreground shrink-0" />
                      <span>Position précise (Ma position GPS, Choisir un lieu)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-3 w-3 border-2 border-muted-foreground shrink-0 rounded-none" style={{ width: 12, height: 12 }} />
                      <span>Spots non GPS</span>
                    </li>
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {searchLower && (
            <p className="text-xs text-muted-foreground">Rayon : 50 km</p>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full py-20">
            <div className="animate-pulse text-muted-foreground">Chargement de la carte...</div>
          </div>
        ) : (
          <div ref={mapRef} className="z-0 absolute inset-0" />
        )}
      </div>
    </div>
  );
};

export default SpotMap;
