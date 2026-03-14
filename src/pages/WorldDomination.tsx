import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { TeamSelector, type TeamColor } from "@/components/game/TeamSelector";
import { WorldMap, type POI } from "@/components/game/WorldMap";
import { ArrowLeft, Home, MapPin, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS = 500; // meters

export default function WorldDomination() {
  const { user } = useAuth();
  const { canManagePois } = useUserRole();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [teamColor, setTeamColor] = useState<TeamColor | null>(null);
  const [loading, setLoading] = useState(true);
  const [pois, setPois] = useState<POI[]>([]);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Load user profile team + POIs
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: poiData }] = await Promise.all([
      supabase.from("profiles").select("team_color").eq("user_id", user.id).single(),
      supabase.from("map_pois").select("id, name, latitude, longitude, owner_team, invulnerable_until, image_url") as any,
    ]);
    setTeamColor((profile as any)?.team_color ?? null);
    setPois((poiData as POI[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Team selection
  if (!teamColor) {
    return (
      <TeamSelector
        userId={user.id}
        onTeamSelected={(team) => setTeamColor(team)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Glass Header */}
      <header className="glass-header sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={() => navigate("/card-game")} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-heading text-foreground truncate">{t.wdom_title as string}</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{
              background: teamColor === "blue" ? "#3b82f6" : teamColor === "red" ? "#ef4444" : teamColor === "green" ? "#22c55e" : "#a0a0a0",
              boxShadow: `0 0 8px ${teamColor === "blue" ? "#3b82f640" : teamColor === "red" ? "#ef444440" : teamColor === "green" ? "#22c55e40" : "#a0a0a040"}`
            }} />
            <span className="text-[10px] font-heading uppercase text-muted-foreground">{teamColor}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canManagePois && (
            <Link to="/card-game/poi-manager" className="text-muted-foreground hover:text-primary transition-colors" title={t.poi_manager_link as string}>
              <MapPinned className="h-5 w-5" />
            </Link>
          )}
          <Link to="/home" className="text-muted-foreground hover:text-primary transition-colors">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Map */}
      <div className="relative">
        <WorldMap
          pois={pois}
          userTeam={teamColor}
          onPOIClick={(poi) => {
            if (!userPosition) {
              toast.error(t.wdom_gps_waiting as string);
              return;
            }
            const dist = distanceMeters(userPosition.lat, userPosition.lng, poi.latitude, poi.longitude);
            if (dist > NEARBY_RADIUS) {
              toast.error(t.wdom_too_far as string);
              return;
            }
            navigate(`/card-game/poi/${poi.id}`);
          }}
          userPosition={userPosition}
        />

        {/* GPS status — glass pill */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel-sm text-[10px]">
          <MapPin className="h-3 w-3" />
          {userPosition ? (
            <span className="text-primary font-semibold">{t.wdom_gps_active as string}</span>
          ) : (
            <span className="text-muted-foreground">{t.wdom_gps_waiting as string}</span>
          )}
        </div>
      </div>

      {/* Legend — glass strip */}
      <div className="px-4 py-3 flex items-center justify-center gap-4 text-[10px]">
        {["blue", "red", "green", "black"].map((c) => (
          <div key={c} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{
              background: c === "blue" ? "#3b82f6" : c === "red" ? "#ef4444" : c === "green" ? "#22c55e" : "#a0a0a0"
            }} />
            <span className="uppercase font-heading text-muted-foreground">{c}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
          <span className="text-muted-foreground font-sans normal-case">{t.wdom_unowned as string}</span>
        </div>
      </div>
    </div>
  );
}
