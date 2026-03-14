import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { POIDetail } from "@/components/game/POIDetail";
import type { TeamColor } from "@/components/game/TeamSelector";

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS = 500;

type POIRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  owner_team: string | null;
  invulnerable_until: string | null;
  image_url: string | null;
};

export default function POIDetailPage() {
  const { poiId } = useParams<{ poiId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [poi, setPoi] = useState<POIRow | null>(null);
  const [teamColor, setTeamColor] = useState<TeamColor | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadPoi = useCallback(async () => {
    if (!poiId) return null;
    const { data, error } = await supabase
      .from("map_pois")
      .select("id, name, latitude, longitude, owner_team, invulnerable_until, image_url")
      .eq("id", poiId)
      .single();
    if (error || !data) return null;
    return data as POIRow;
  }, [poiId]);

  useEffect(() => {
    if (!user || !poiId) {
      if (poiId) setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [poiData, { data: profile }] = await Promise.all([
        loadPoi(),
        supabase.from("profiles").select("team_color").eq("user_id", user.id).single(),
      ]);
      if (cancelled) return;
      if (!poiData) {
        setNotFound(true);
        setPoi(null);
      } else {
        setPoi(poiData);
      }
      setTeamColor((profile as { team_color: TeamColor } | null)?.team_color ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, poiId, loadPoi]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  const isNearby = poi && userPosition
    ? distanceMeters(userPosition.lat, userPosition.lng, poi.latitude, poi.longitude) <= NEARBY_RADIUS
    : false;

  const handleClose = useCallback(() => {
    navigate("/card-game/world-domination");
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    const updated = await loadPoi();
    if (updated) setPoi(updated);
  }, [loadPoi]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !poi || !teamColor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-muted-foreground text-center">
          {notFound ? (t.wdom_poi_not_found as string) : "…"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/card-game/world-domination")}
          className="text-sm text-primary underline"
        >
          {t.wdom_back_to_map as string}
        </button>
      </div>
    );
  }

  return (
    <POIDetail
      poi={poi}
      userTeam={teamColor}
      userId={user.id}
      isNearby={isNearby}
      onClose={handleClose}
      onRefresh={handleRefresh}
      asPage
    />
  );
}
