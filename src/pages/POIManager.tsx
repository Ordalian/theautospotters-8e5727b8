import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, MapPin, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationMapPicker } from "@/components/LocationMapPicker";
import { toast } from "sonner";

interface MapPOI {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  owner_team: string | null;
  invulnerable_until: string | null;
  created_at: string;
}

const POI_IMAGES_BUCKET = "poi-images";

export default function POIManager() {
  const { user } = useAuth();
  const { canManagePois, loading: roleLoading } = useUserRole();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pois, setPois] = useState<MapPOI[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLat, setAddLat] = useState<number | null>(null);
  const [addLng, setAddLng] = useState<number | null>(null);
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPois = useCallback(async () => {
    const { data, error } = await supabase
      .from("map_pois")
      .select("id, name, latitude, longitude, image_url, owner_team, invulnerable_until, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPois((data as MapPOI[]) ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadPois().finally(() => setLoading(false));
  }, [user, loadPois]);

  useEffect(() => {
    if (!roleLoading && !canManagePois && user) {
      navigate("/card-game", { replace: true });
    }
  }, [canManagePois, roleLoading, user, navigate]);

  const handleAddSubmit = async () => {
    if (!addName.trim()) {
      toast.error(t.poi_manager_name_required as string);
      return;
    }
    if (addLat == null || addLng == null) {
      toast.error(t.poi_manager_place_required as string);
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (addImageFile) {
        const ext = addImageFile.name.split(".").pop() || "jpg";
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(POI_IMAGES_BUCKET)
          .upload(path, addImageFile, { upsert: false });
        if (uploadErr) {
          toast.error(uploadErr.message || "Upload failed");
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(POI_IMAGES_BUCKET).getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("map_pois").insert({
        name: addName.trim(),
        latitude: addLat,
        longitude: addLng,
        image_url: imageUrl,
      } as any);
      if (error) throw error;
      toast.success(t.poi_manager_added as string);
      setAddOpen(false);
      setAddName("");
      setAddLat(null);
      setAddLng(null);
      setAddImageFile(null);
      loadPois();
      qc.invalidateQueries({ queryKey: ["world-domination-pois"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const poi = pois.find((p) => p.id === id);
    if (!poi || !confirm(t.poi_manager_confirm_delete as string)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("map_pois").delete().eq("id", id);
      if (error) throw error;
      toast.success(t.poi_manager_deleted as string);
      loadPois();
      qc.invalidateQueries({ queryKey: ["world-domination-pois"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canManagePois) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/card-game")}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-heading text-foreground truncate flex-1 text-center">
          {t.poi_manager_title as string}
        </h1>
        <div className="w-5" />
      </header>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        <Button
          className="w-full font-heading rounded-xl gap-2"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t.poi_manager_add_poi as string}
        </Button>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pois.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {t.poi_manager_no_pois as string}
          </p>
        ) : (
          <ul className="space-y-3">
            {pois.map((poi) => (
              <li
                key={poi.id}
                className="rounded-xl border border-border bg-card overflow-hidden flex gap-3 p-3"
              >
                <div className="w-20 h-20 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                  {poi.image_url ? (
                    <img
                      src={poi.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-foreground truncate">
                    {poi.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(poi.id)}
                  disabled={deletingId === poi.id}
                >
                  {deletingId === poi.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add POI dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{t.poi_manager_add_poi as string}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                {t.poi_manager_name as string}
              </label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t.poi_manager_name_placeholder as string}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                {t.poi_manager_location as string}
              </label>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => setMapPickerOpen(true)}
              >
                <MapPin className="h-4 w-4" />
                {addLat != null && addLng != null
                  ? `${addLat.toFixed(4)}, ${addLng.toFixed(4)}`
                  : (t.poi_manager_choose_on_map as string)}
              </Button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                {t.poi_manager_image as string}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="rounded-xl file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-xs"
                  onChange={(e) => setAddImageFile(e.target.files?.[0] ?? null)}
                />
                {addImageFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {addImageFile.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setAddOpen(false)}
                disabled={submitting}
              >
                {t.poi_manager_cancel as string}
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleAddSubmit}
                disabled={submitting || !addName.trim() || addLat == null || addLng == null}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t.poi_manager_save as string
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LocationMapPicker
        open={mapPickerOpen}
        onOpenChange={setMapPickerOpen}
        initialCenter={
          addLat != null && addLng != null ? { lat: addLat, lng: addLng } : null
        }
        onSelect={(lat, lng) => {
          setAddLat(lat);
          setAddLng(lng);
          setMapPickerOpen(false);
        }}
      />
    </div>
  );
}
