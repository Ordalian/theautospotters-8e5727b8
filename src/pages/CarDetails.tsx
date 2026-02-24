import { useState, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { callCarApi } from "@/lib/carApi";
import { ArrowLeft, Car, Loader2, X, Trash2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { RatingExplainer } from "@/components/RatingExplainer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CarDetail {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  edition: string | null;
  engine: string | null;
  finitions: string | null;
  seen_on_road: boolean;
  parked: boolean;
  stock: boolean;
  modified: boolean;
  modified_comment: string | null;
  car_meet: boolean;
  image_url: string | null;
  location_name: string | null;
  created_at: string;
  quality_rating: number | null;
  rarity_rating: number | null;
  delivered_by_user_id: string | null;
  vehicle_type: string;
  linked_car_id: string | null;
}

interface CarInfoResult {
  description: string;
  engines: { name: string; displacement: string; fuel: string; hp: number }[];
}

const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photoPopupOpen, setPhotoPopupOpen] = useState(false);

  const navState = location.state as { carIds?: string[]; returnTo?: string } | null;
  const carIds = navState?.carIds ?? null;
  const returnTo = navState?.returnTo ?? null;
  const currentIndex = carIds && id ? carIds.indexOf(id) : -1;
  const prevId = carIds && carIds.length > 1 && id
    ? carIds[currentIndex <= 0 ? carIds.length - 1 : currentIndex - 1]
    : null;
  const nextId = carIds && carIds.length > 1 && id
    ? carIds[currentIndex < 0 || currentIndex >= carIds.length - 1 ? 0 : currentIndex + 1]
    : null;
  const swipeState = useRef<{ startX: number; startY: number; isTouch: boolean } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const navigateToSibling = (targetId: string) => {
    navigate(`/car/${targetId}`, { state: { carIds, returnTo } });
  };

  const onSwipeStart = (clientX: number, clientY: number, isTouch: boolean) => {
    if (!carIds || carIds.length < 2) return;
    swipeState.current = { startX: clientX, startY: clientY, isTouch };
    if (!isTouch) {
      window.addEventListener("mouseup", (e: MouseEvent) => {
        if (swipeState.current?.isTouch) return;
        if (swipeState.current) {
          const deltaX = e.clientX - swipeState.current.startX;
          const deltaY = e.clientY - swipeState.current.startY;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          if (absX >= 50 && absX >= absY * 0.6) {
            if (deltaX > 0 && prevId) navigateToSibling(prevId);
            else if (deltaX < 0 && nextId) navigateToSibling(nextId);
          }
        }
        swipeState.current = null;
      }, { once: true });
    }
  };
  const onSwipeEnd = (clientX: number, clientY: number) => {
    const s = swipeState.current;
    if (!s || !s.isTouch || !carIds || carIds.length < 2) return;
    const deltaX = clientX - s.startX;
    const deltaY = clientY - s.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX >= 50 && absX >= absY * 0.6) {
      if (deltaX > 0 && prevId) navigateToSibling(prevId);
      else if (deltaX < 0 && nextId) navigateToSibling(nextId);
    }
    swipeState.current = null;
  };

  const { data: carRaw, isLoading: loading } = useQuery({
    queryKey: ["car", id],
    queryFn: async () => {
      const colsWithType = "id, user_id, brand, model, year, edition, engine, finitions, seen_on_road, parked, stock, modified, modified_comment, car_meet, image_url, created_at, quality_rating, rarity_rating, car_condition, photo_source, latitude, longitude, location_name, delivered_by_user_id, vehicle_type";
      const colsWithoutType = "id, user_id, brand, model, year, edition, engine, finitions, seen_on_road, parked, stock, modified, modified_comment, car_meet, image_url, created_at, quality_rating, rarity_rating, car_condition, photo_source, latitude, longitude, location_name, delivered_by_user_id";
      const { data, error } = await supabase.from("cars").select(colsWithType).eq("id", id!).maybeSingle();
      if (!error && data) return data as (Omit<CarDetail, "linked_car_id"> & { linked_car_id?: string | null }) | null;
      const { data: fallback, error: err2 } = await supabase.from("cars").select(colsWithoutType).eq("id", id!).maybeSingle();
      if (err2) throw err2;
      return fallback ? ({ ...fallback, vehicle_type: "car" } as Omit<CarDetail, "linked_car_id"> & { linked_car_id?: string | null }) : null;
    },
    enabled: !!user && !!id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: linkedCarId } = useQuery({
    queryKey: ["car-linked-id", id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("cars").select("linked_car_id").eq("id", id!).maybeSingle();
        if (error) return null;
        return (data as any)?.linked_car_id ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!id && !!carRaw,
    staleTime: 10 * 60 * 1000,
  });

  const car = useMemo((): CarDetail | null => {
    if (!carRaw) return null;
    return { ...carRaw, vehicle_type: carRaw.vehicle_type ?? "car", linked_car_id: linkedCarId } as CarDetail;
  }, [carRaw, linkedCarId]);

  const isOwner = !!user && car?.user_id === user.id;
  const needLinkType = car ? ((car.vehicle_type || "car") === "hot_wheels" ? "spot" : "hot_wheels") : null;
  const { data: carsToLink = [] } = useQuery({
    queryKey: ["my-cars-to-link", user?.id, needLinkType, car?.id],
    queryFn: async () => {
      if (!user || !needLinkType || !car) return [];
      if (needLinkType === "hot_wheels") {
        const { data } = await supabase
          .from("cars")
          .select("id, brand, model, year, image_url, vehicle_type")
          .eq("user_id", user.id)
          .eq("vehicle_type", "hot_wheels")
          .neq("id", car.id)
          .is("linked_car_id", null)
          .order("created_at", { ascending: false });
        return (data ?? []) as { id: string; brand: string; model: string; year: number; image_url: string | null; vehicle_type: string }[];
      }
      // Spots: include vehicle_type in (car, truck, ...) OR vehicle_type is null (legacy rows)
      const { data } = await supabase
        .from("cars")
        .select("id, brand, model, year, image_url, vehicle_type")
        .eq("user_id", user.id)
        .neq("id", car.id)
        .is("linked_car_id", null)
        .or("vehicle_type.in.(car,truck,motorcycle,boat,plane,train),vehicle_type.is.null")
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; brand: string; model: string; year: number; image_url: string | null; vehicle_type: string }[];
    },
    enabled: !!user && !!car && linkDialogOpen && !!needLinkType,
    staleTime: 60 * 1000,
  });

  const { data: linkedCar } = useQuery({
    queryKey: ["linked-car-summary", car?.linked_car_id],
    queryFn: async () => {
      if (!car?.linked_car_id) return null;
      const { data } = await supabase
        .from("cars")
        .select("id, brand, model, vehicle_type")
        .eq("id", car.linked_car_id)
        .maybeSingle();
      return data as { id: string; brand: string; model: string; vehicle_type: string } | null;
    },
    enabled: !!car?.linked_car_id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: extraPhotos = [] } = useQuery({
    queryKey: ["car-photos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("car_photos")
        .select("id, image_url, position")
        .eq("car_id", id!)
        .order("position", { ascending: true });
      return (data as { id: string; image_url: string; position: number }[]) ?? [];
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  const allPhotoUrls = useMemo(() => {
    if (!car) return [];
    const main = car.image_url ? [car.image_url] : [];
    const extra = extraPhotos
      .map((p) => p.image_url)
      .filter((url) => url && !main.includes(url));
    return [...main, ...extra];
  }, [car, extraPhotos]);

  const deliveredByUserId = car?.delivered_by_user_id ?? null;
  const { data: deliveredByProfile } = useQuery({
    queryKey: ["profile", deliveredByUserId],
    queryFn: async () => {
      if (!deliveredByUserId) return null;
      const { data } = await supabase.from("profiles").select("username").eq("user_id", deliveredByUserId).maybeSingle();
      return data?.username ?? null;
    },
    enabled: !!deliveredByUserId,
    staleTime: 10 * 60 * 1000,
  });

  const carKey = car ? `${car.brand}-${car.model}-${car.year}-${car.edition || ""}` : "";

  const { data: carInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ["car-info", carKey],
    queryFn: async () => {
      return callCarApi<CarInfoResult>({
        action: "car-info",
        brand: car!.brand,
        model: car!.model,
        year: car!.year,
        ...(car!.edition ? { edition: car!.edition } : {}),
      });
    },
    enabled: !!car && !!car.brand && !!car.model && car.year != null,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const description = carInfo?.description;
  const engines = carInfo?.engines ?? [];

  const getBadges = (c: CarDetail) => {
    const badges: string[] = [];
    if (c.seen_on_road) badges.push("🛣️ Road");
    if (c.parked) badges.push("🅿️ Parked");
    if (c.stock) badges.push("Stock");
    if (c.modified) badges.push("🔧 Modified");
    if (c.car_meet) badges.push("🏁 Meet");
    return badges;
  };

  const handleLinkTo = async (targetId: string) => {
    if (!user || !car || car.user_id !== user.id) return;
    setLinking(true);
    try {
      const { error: e1 } = await supabase.from("cars").update({ linked_car_id: targetId } as any).eq("id", car.id).eq("user_id", user.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("cars").update({ linked_car_id: car.id } as any).eq("id", targetId).eq("user_id", user.id);
      if (e2) throw e2;
      toast.success(t.car_detail_linked as string);
      setLinkDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["car", car.id] });
      queryClient.invalidateQueries({ queryKey: ["car", targetId] });
      queryClient.invalidateQueries({ queryKey: ["car-linked-id", car.id] });
      queryClient.invalidateQueries({ queryKey: ["car-linked-id", targetId] });
    } catch (err: any) {
      toast.error(err?.message ?? (t.error as string));
    } finally {
      setLinking(false);
    }
  };

  const handleDelete = async () => {
    if (!car || !user || car.user_id !== user.id) return;
    if (!confirm(t.car_detail_delete_confirm as string)) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("cars").delete().eq("id", car.id).eq("user_id", user.id);
      if (error) throw error;
      toast.success(t.car_detail_deleted as string);
      queryClient.invalidateQueries({ queryKey: ["my-cars", user.id] });
      navigate("/garage");
    } catch (err: any) {
      toast.error(err?.message || (t.car_detail_delete_error as string));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <Car className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">{t.car_detail_not_found as string}</p>
        <Button variant="outline" onClick={() => (returnTo ? navigate(returnTo) : navigate(-1))}>{t.car_detail_go_back as string}</Button>
      </div>
    );
  }

  const hasLinkedCar = !!car.linked_car_id && !!linkedCar;
  const isCurrentHotWheels = (car.vehicle_type || "car") === "hot_wheels";

  return (
    <div
      className={`min-h-screen relative touch-pan-y ${hasLinkedCar ? "bg-gradient-to-b from-amber-600/15 via-amber-500/8 to-amber-600/12" : "bg-background"}`}
      onTouchStart={(e) => e.touches.length === 1 && onSwipeStart(e.touches[0].clientX, e.touches[0].clientY, true)}
      onTouchEnd={(e) => e.changedTouches.length === 1 && onSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
      onMouseDown={(e) => e.button === 0 && onSwipeStart(e.clientX, e.clientY, false)}
    >
      <BlackGoldBg />
      <header className={`sticky top-0 z-20 flex items-center gap-2 px-4 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 ${hasLinkedCar ? "border-amber-500/60 bg-amber-950/20" : "border-border/50"}`}>
        <Button variant="ghost" size="icon" onClick={() => (returnTo ? navigate(returnTo) : navigate(-1))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate flex-1 min-w-0">
          {car.brand} {car.model}
        </h1>
        {hasLinkedCar && linkedCar && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/40 rounded-lg px-2.5"
            onClick={() => navigate(`/car/${car.linked_car_id}`, { state: location.state })}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">
              {isCurrentHotWheels ? (t.car_detail_view_spot as string) : (t.car_detail_view_hot_wheels as string)}
            </span>
          </Button>
        )}
        {user && car.user_id === user.id && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={t.car_detail_delete as string}
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </Button>
        )}
      </header>

      <div className="relative z-10 max-w-2xl mx-auto">
        {car.image_url || allPhotoUrls.length > 0 ? (
          <button
            type="button"
            onClick={() => { setPhotoIndex(0); setPhotoPopupOpen(true); }}
            className={`w-full h-64 overflow-hidden block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary rounded-b-xl relative ${hasLinkedCar ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background shadow-lg shadow-amber-900/20" : ""}`}
          >
            <img
              src={allPhotoUrls[0] ?? car.image_url ?? ""}
              alt={`${car.brand} ${car.model}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {allPhotoUrls.length > 1 && (
              <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span>{allPhotoUrls.length} {t.car_detail_photos as string}</span>
              </span>
            )}
          </button>
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-secondary/20">
            <Car className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}

        <div className={`p-4 space-y-5 ${hasLinkedCar ? "rounded-xl border-2 border-amber-500/40 bg-amber-950/25 shadow-inner shadow-amber-900/10 mx-2 mb-4" : ""}`}>
          <div>
            <h2 className={`text-2xl font-bold ${hasLinkedCar ? "text-amber-200" : ""}`}>{car.brand} {car.model}</h2>
            <p className={hasLinkedCar ? "text-amber-200/80" : "text-muted-foreground"}>{car.year}</p>
            {car.edition?.trim() && (
              <p className={`text-sm mt-0.5 ${hasLinkedCar ? "text-amber-200/80" : "text-muted-foreground"}`}>
                {t.car_detail_series as string} : <span className={`font-medium ${hasLinkedCar ? "text-amber-100" : "text-foreground"}`}>{car.edition}</span>
              </p>
            )}
            {car.finitions?.trim() && (
              <p className={`text-sm mt-0.5 ${hasLinkedCar ? "text-amber-200/80" : "text-muted-foreground"}`}>
                {t.car_detail_finitions as string} : <span className={`font-medium ${hasLinkedCar ? "text-amber-100" : "text-foreground"}`}>{car.finitions}</span>
              </p>
            )}
            {car.delivered_by_user_id && (
              <p className="text-sm text-primary mt-1.5 font-medium">
                {t.car_detail_delivered_text as string} {deliveredByProfile ?? (t.car_detail_a_friend as string)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <RatingExplainer rarityLevel={car.rarity_rating ?? 5} qualityLevel={car.quality_rating ?? 3} size="md" />
            </div>
          </div>

          {car.modified && car.modified_comment?.trim() && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t.car_detail_modifications as string}</p>
              <p className="text-sm leading-relaxed">{car.modified_comment}</p>
            </div>
          )}

          {car.engine && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t.car_detail_engine as string}</p>
              <p className="font-medium">{car.engine}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {getBadges(car).map((badge) => (
              <span key={badge} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{badge}</span>
            ))}
          </div>

          {car.location_name && <p className="text-sm text-muted-foreground">📍 {car.location_name}</p>}
          <p className="text-sm text-muted-foreground">{t.car_detail_spotted_on as string} {new Date(car.created_at).toLocaleDateString()}</p>

          {isOwner && !hasLinkedCar && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                {isCurrentHotWheels ? (t.car_detail_link_spot_desc as string) : (t.car_detail_link_hot_wheels_desc as string)}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400" onClick={() => setLinkDialogOpen(true)}>
                <Sparkles className="h-4 w-4" />
                {isCurrentHotWheels ? (t.car_detail_link_spot as string) : (t.car_detail_link_hot_wheels as string)}
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.car_detail_about_model as string}</p>
            {loadingInfo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t.car_detail_loading as string}
              </div>
            ) : description ? (
              <div className="text-sm leading-[1.85] text-pretty space-y-4">
                {(() => {
                  const rawParagraphs = description.split(/\n+/).filter((p: string) => p.trim());
                  const result: string[] = [];
                  for (const para of rawParagraphs) {
                    const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
                    for (let i = 0; i < sentences.length; i += 2) {
                      result.push(sentences.slice(i, i + 2).join("").trim());
                    }
                  }
                  return result.filter(Boolean).map((p, i) => <p key={i}>{p}</p>);
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.car_detail_no_desc as string}</p>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.car_detail_engines_title as string}</p>
            {loadingInfo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t.car_detail_loading as string}
              </div>
            ) : engines.length > 0 ? (
              <ul className="space-y-2">
                {engines.map((eng, i) => (
                  <li key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                    <span className="font-medium">{eng.name}</span>
                    <span className="text-muted-foreground">{eng.hp} hp • {eng.fuel}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t.car_detail_no_engines as string}</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {needLinkType === "hot_wheels" ? (t.car_detail_link_hot_wheels as string) : (t.car_detail_link_spot as string)}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {carsToLink.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t.car_detail_link_none as string}</p>
            ) : (
              carsToLink.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={linking}
                  onClick={() => handleLinkTo(c.id)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left hover:border-amber-500/40 transition-colors"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <Car className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.brand} {c.model}</p>
                    <p className="text-xs text-muted-foreground">{c.year}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={photoPopupOpen}
        onOpenChange={(open) => {
          setPhotoPopupOpen(open);
          if (!open) setPhotoIndex(0);
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 overflow-hidden bg-black/95 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{car.brand} {car.model} – {photoIndex + 1}/{allPhotoUrls.length}</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setPhotoPopupOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={t.close as string}
          >
            <X className="h-5 w-5" />
          </button>
          {allPhotoUrls.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => (i === 0 ? allPhotoUrls.length - 1 : i - 1)); }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-12 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => (i === allPhotoUrls.length - 1 ? 0 : i + 1)); }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          <img
            src={allPhotoUrls[photoIndex] ?? car.image_url!}
            alt={`${car.brand} ${car.model}`}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain mx-auto"
            onClick={(e) => e.stopPropagation()}
          />
          {allPhotoUrls.length > 1 && (
            <p className="text-center text-sm text-white/70 pb-2">
              {photoIndex + 1} / {allPhotoUrls.length}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarDetails;
