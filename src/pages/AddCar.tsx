import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { callCarApi } from "@/lib/carApi";
import { resizeImage, blurPlateInImage, dataUrlToFile } from "@/lib/imageUtils";
import { carBrands, getModelsForBrand, getYearsForModel } from "@/data/carData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Check, MapPin, Loader2, Map, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhotoUploadDialog, PhotoPreview, type PhotoSourceType } from "@/components/PhotoUpload";
import { CarConditionSelector } from "@/components/CarConditionSelector";
import { LocationMapPicker } from "@/components/LocationMapPicker";
import { searchPlaceOrMidpoint, reverseGeocode } from "@/lib/geocode";
import { useLanguage } from "@/i18n/LanguageContext";
import { 
  type CarCondition, 
  type PhotoSource,
  calculateQualityRating,
  calculateRarityRating 
} from "@/lib/carRatings";

const AddCar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const isDeliveryMode = searchParams.get("delivery") === "1";

  // Prefill from query params (from AutoSpotter)
  const [brand, setBrand] = useState(searchParams.get("brand") || "");
  const [model, setModel] = useState(searchParams.get("model") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [seenOnRoad, setSeenOnRoad] = useState(searchParams.get("seen_on_road") === "true");
  const [parked, setParked] = useState(searchParams.get("parked") === "true");
  const [stock, setStock] = useState(searchParams.get("stock") !== "false");
  const [modified, setModified] = useState(searchParams.get("modified") === "true");
  const [carMeet, setCarMeet] = useState(searchParams.get("car_meet") === "true");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(searchParams.get("image_url") || null);
  const [additionalPhotoUrls, setAdditionalPhotoUrls] = useState<string[]>(() => {
    const urls: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const u = searchParams.get(`photo_${i}`);
      if (u) urls.push(u);
    }
    return urls;
  });
  const [additionalPhotoFiles, setAdditionalPhotoFiles] = useState<{ file: File; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [edition, setEdition] = useState("");
  const [editions, setEditions] = useState<string[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [showEditions, setShowEditions] = useState(false);
  const [finitions, setFinitions] = useState("");
  const [engine, setEngine] = useState(searchParams.get("engine") || "");
  const [engines, setEngines] = useState<{ name: string; displacement: string; fuel: string; hp: number }[]>([]);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [showEngines, setShowEngines] = useState(false);
  const [modifiedComment, setModifiedComment] = useState("");
  const [locationName, setLocationName] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMode, setLocationMode] = useState<"gps" | "map" | "text">("gps");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);

  // New rating system states
  const [carCondition, setCarCondition] = useState<CarCondition>("good");
  const [photoSourceType, setPhotoSourceType] = useState<PhotoSourceType | null>(null);
  const [isPhotoBlurry, setIsPhotoBlurry] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showExtraPhotoDialog, setShowExtraPhotoDialog] = useState(false);
  const [spotDate, setSpotDate] = useState("");

  // Initialiser la source de la photo si elle vient d'AutoSpotter
  useEffect(() => {
    const sourceFromQuery = searchParams.get("photo_source_type") as PhotoSourceType | null;
    if (sourceFromQuery) {
      setPhotoSourceType(sourceFromQuery);
    }
  }, []);

  // Search states
  const [brandSearch, setBrandSearch] = useState(brand);
  const [modelSearch, setModelSearch] = useState(model);
  const [showBrands, setShowBrands] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showYears, setShowYears] = useState(false);

  const filteredBrands = carBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const models = getModelsForBrand(brand);
  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const years = getYearsForModel(brand, model);

  // Reset model/year when brand changes
  useEffect(() => {
    if (!searchParams.get("model")) {
      setModel("");
      setModelSearch("");
      setYear("");
      setEdition("");
      setEditions([]);
      setEngines([]);
      setEngine("");
    }
  }, [brand]);

  // Reset edition and engines when year changes (so user refetches for new year)
  useEffect(() => {
    setEdition("");
    setEditions([]);
    setEngines([]);
    setEngine("");
  }, [year]);

  const handlePhotoSelect = (file: File, source: PhotoSourceType) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.onerror = () => toast.error(t.error as string);
    reader.readAsDataURL(file);
    setPhotoSourceType(source);
    setIsPhotoBlurry(false);
    if (source === "camera") {
      setSpotDate("");
    }
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setPhotoSourceType(null);
    setIsPhotoBlurry(false);
    setSpotDate("");
  };

  const handleAddExtraPhoto = (file: File) => {
    if (additionalPhotoUrls.length + additionalPhotoFiles.length >= 4) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAdditionalPhotoFiles((prev) => [...prev, { file, preview: reader.result as string }]);
    };
    reader.readAsDataURL(file);
  };

  const removeAdditionalUrl = (index: number) => {
    setAdditionalPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !brand || !model || !year) {
      toast.error(t.add_car_fill_required as string);
      return;
    }
    if (isDeliveryMode && !imageFile && !imagePreview) {
      toast.error(t.add_car_photo_required as string);
      return;
    }
    setLoading(true);
    try {
      // Use plate passed from AutoSpotter if available, otherwise extract from photo
      let extractedPlateFromPhoto: string | null = searchParams.get("extracted_plate") || null;
      let mainImageFileToUpload: File | null = null;

      if (imageFile) {
        // Fresh file upload (not from AutoSpotter) → extract plate + blur
        try {
          const base64 = await resizeImage(imageFile, 800, 0.7);
          const r = await callCarApi<{ license_plate: string | null; plate_bbox: { x: number; y: number; width: number; height: number } | null }>({ action: "extract_plate", images: [base64] });
          const plate = r?.license_plate?.replace(/\s|-|\./g, "").toUpperCase().slice(0, 20);
          if (plate && plate.length >= 2) extractedPlateFromPhoto = plate;
          if (r?.plate_bbox) {
            const blurredDataUrl = await blurPlateInImage(base64, r.plate_bbox);
            mainImageFileToUpload = dataUrlToFile(blurredDataUrl, imageFile.name.replace(/\.[^.]+$/i, ".jpg") || "photo.jpg");
          } else {
            mainImageFileToUpload = imageFile;
          }
        } catch {
          mainImageFileToUpload = imageFile;
        }
      } else if (imagePreview?.startsWith("data:")) {
        // Data URL (not from AutoSpotter) → extract plate + blur
        try {
          const r = await callCarApi<{ license_plate: string | null; plate_bbox: { x: number; y: number; width: number; height: number } | null }>({ action: "extract_plate", images: [imagePreview] });
          const plate = r?.license_plate?.replace(/\s|-|\./g, "").toUpperCase().slice(0, 20);
          if (plate && plate.length >= 2) extractedPlateFromPhoto = plate;
          if (r?.plate_bbox) {
            const blurredDataUrl = await blurPlateInImage(imagePreview, r.plate_bbox);
            mainImageFileToUpload = dataUrlToFile(blurredDataUrl, "photo.jpg");
          }
        } catch {
          /* ignore */
        }
      }
      // If imagePreview is a public URL (from AutoSpotter), blur was already done there

      let imageUrl: string | null = imagePreview && !imageFile ? imagePreview : null;

      if (imageFile || mainImageFileToUpload) {
        const fileToUpload = mainImageFileToUpload ?? imageFile!;
        const ext = fileToUpload.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("car-photos")
          .upload(path, fileToUpload);
        if (uploadErr) {
          const storageMsg = uploadErr.message || "Upload failed";
          throw new Error(`Photo: ${storageMsg}`);
        }
        const { data: urlData } = supabase.storage
          .from("car-photos")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const allPhotoUrls: string[] = imageUrl ? [imageUrl] : [];
      for (const u of additionalPhotoUrls) {
        if (u && !allPhotoUrls.includes(u)) allPhotoUrls.push(u);
      }
      for (let i = 0; i < additionalPhotoFiles.length; i++) {
        const { file, preview } = additionalPhotoFiles[i];
        let fileToUpload: File = file;
        if (preview.startsWith("data:")) {
          try {
            const r = await callCarApi<{ plate_bbox: { x: number; y: number; width: number; height: number } | null }>({ action: "extract_plate", images: [preview] });
            if (r?.plate_bbox) {
              const blurredDataUrl = await blurPlateInImage(preview, r.plate_bbox);
              fileToUpload = dataUrlToFile(blurredDataUrl, file.name.replace(/\.[^.]+$/i, ".jpg") || "photo.jpg");
            }
          } catch {
            /* keep original */
          }
        }
        const ext = fileToUpload.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${allPhotoUrls.length}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("car-photos").upload(path, fileToUpload);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("car-photos").getPublicUrl(path);
          allPhotoUrls.push(urlData.publicUrl);
        }
      }

      // Calculate photo source enum
      let photoSource: PhotoSource = "none";
      if (photoSourceType && (imageFile || imagePreview)) {
        if (photoSourceType === "camera") {
          photoSource = isPhotoBlurry ? "camera_blurry" : "camera_clear";
        } else {
          photoSource = isPhotoBlurry ? "gallery_blurry" : "gallery_clear";
        }
      }

      // Calculate ratings
      const qualityRating = calculateQualityRating(photoSource, carCondition);
      const rarityRating = calculateRarityRating(brand, model);

      const insertPayload: Record<string, any> = {
        user_id: user.id,
        brand,
        model,
        year: parseInt(year),
        edition: edition || null,
        finitions: finitions.trim() || null,
        seen_on_road: seenOnRoad,
        parked,
        stock,
        modified,
        modified_comment: modified ? (modifiedComment.trim().slice(0, 500) || null) : null,
        car_meet: carMeet,
        image_url: allPhotoUrls[0] ?? imageUrl ?? null,
        engine: engine || null,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        location_name: locationName || null,
        location_precision: locationMode === "text" ? "general" : "precise",
        car_condition: carCondition,
        photo_source: photoSource,
        quality_rating: qualityRating.level,
        rarity_rating: rarityRating.level,
        license_plate: extractedPlateFromPhoto,
      };

      // --- Check if plate matches an owned vehicle for bonus ---
      if (extractedPlateFromPhoto) {
        try {
          const { data: match } = await supabase
            .from("owned_vehicles")
            .select("id, user_id")
            .eq("license_plate", extractedPlateFromPhoto)
            .maybeSingle();
          if (match) {
            await supabase
              .from("owned_vehicles")
              .update({ car_id: null })
              .eq("id", match.id);
            (insertPayload as any).__owned_vehicle_id = match.id;
            (insertPayload as any).__owned_vehicle_user_id = match.user_id;
          }
        } catch {
          /* ignore matching errors */
        }
      }

      // Gallery photo with custom spot date → override created_at
      if (photoSourceType === "gallery" && spotDate) {
        insertPayload.created_at = new Date(spotDate).toISOString();
      }

      // Remove internal tracking fields before insert
      const ownedVehicleId = (insertPayload as any).__owned_vehicle_id;
      delete (insertPayload as any).__owned_vehicle_id;
      delete (insertPayload as any).__owned_vehicle_user_id;

      const insertCar = async () => {
        const { data: inserted, error } = await supabase
          .from("cars")
          .insert(insertPayload as any)
          .select("id")
          .single();
        if (error) {
          const err: any = new Error(error.message);
          err.details = error.details;
          err.hint = error.hint;
          throw err;
        }
        if (allPhotoUrls.length > 1) {
          await supabase.from("car_photos").insert(
            allPhotoUrls.map((url, position) => ({
              car_id: inserted.id,
              image_url: url,
              position,
            }))
          );
        }
        // Link owned vehicle to this car
        if (ownedVehicleId) {
          await supabase
            .from("owned_vehicles")
            .update({ car_id: inserted.id })
            .eq("id", ownedVehicleId);
        }
        return inserted;
      };

      if (isDeliveryMode) {
        const inserted = await insertCar();
        toast.success(t.add_car_delivery_added as string);
        navigate(`/deliver-car/select-friend?carId=${inserted.id}`);
      } else {
        await insertCar();
        const successMsg = typeof t.add_car_success === "function" ? t.add_car_success(brand, model) : `${brand} ${model}`;
        toast.success(successMsg);
        navigate("/garage");
      }
    } catch (err: any) {
      const msg =
        err?.message
        ?? err?.error_description
        ?? (typeof err?.details === "string" ? err.details : null)
        ?? (err?.error ? String(err.error) : null)
        ?? "Failed to add car";
      const hint = err?.hint ? ` (${err.hint})` : "";
      toast.error(`${msg}${hint}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    const q = locationSearchQuery.trim();
    if (!q) return;
    setLocationSearchLoading(true);
    try {
      const result = await searchPlaceOrMidpoint(q);
      if (result) {
        setCoords({ lat: result.lat, lng: result.lng });
        setLocationName(result.displayName);
        toast.success("Lieu enregistré");
      } else {
        toast.error("Aucun lieu trouvé");
      }
    } catch {
      toast.error("Erreur de recherche");
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const ToggleChip = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
        checked
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/30"
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate(isDeliveryMode ? "/friends" : "/garage")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.add_car_title as string}</h1>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto pb-32">
        {/* Brand */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.add_car_brand as string}</Label>
          <div className="relative">
            <Input
              placeholder={t.add_car_search_brand as string}
              value={brandSearch}
              onChange={(e) => {
                setBrandSearch(e.target.value);
                setShowBrands(true);
                if (brand && e.target.value !== brand) setBrand("");
              }}
              onFocus={() => setShowBrands(true)}
              className="bg-secondary/30"
            />
            {showBrands && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {filteredBrands.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setBrand(b.name);
                      setBrandSearch(b.name);
                      setShowBrands(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors"
                  >
                    {b.name}
                  </button>
                ))}
                {filteredBrands.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">{t.add_car_no_brands as string}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.add_car_model as string}</Label>
          <div className="relative">
            <Input
              placeholder={brand ? (t.add_car_search_model as string) : (t.add_car_select_brand as string)}
              value={modelSearch}
              onChange={(e) => {
                setModelSearch(e.target.value);
                setShowModels(true);
                if (model && e.target.value !== model) setModel("");
              }}
              onFocus={() => setShowModels(true)}
              disabled={!brand}
              className="bg-secondary/30"
            />
            {showModels && brand && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {filteredModels.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => {
                      setModel(m.name);
                      setModelSearch(m.name);
                      setShowModels(false);
                      setYear("");
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors"
                  >
                    {m.name}
                  </button>
                ))}
                {filteredModels.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">{t.add_car_no_models as string}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Year */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.add_car_year as string}</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => model && setShowYears(!showYears)}
              disabled={!model}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm",
                !model && "opacity-50 cursor-not-allowed",
                !year && "text-muted-foreground"
              )}
            >
              {year || (model ? (t.add_car_select_year as string) : (t.add_car_select_model as string))}
            </button>
            {showYears && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      setYear(String(y));
                      setShowYears(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors"
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edition / Série limitée */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_edition as string}
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                if (!brand || !model || !year) return;
                if (editions.length === 0 && !loadingEditions) {
                  setLoadingEditions(true);
                  try {
                    const data = await callCarApi<{ editions: string[] }>({
                      action: "editions", brand, model, year: parseInt(year),
                    });
                    setEditions(data.editions ?? []);
                  } catch (err: any) {
                    toast.error(err?.message || "Impossible de charger les éditions");
                    setEditions([]);
                  } finally {
                    setLoadingEditions(false);
                  }
                }
                setShowEditions(!showEditions);
              }}
              disabled={!year}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm",
                !year && "opacity-50 cursor-not-allowed",
                !edition && "text-muted-foreground"
              )}
            >
              {loadingEditions ? (t.add_car_edition_loading as string) : edition || (year ? (t.add_car_edition_choose as string) : (t.add_car_edition_select_year as string))}
            </button>
            {showEditions && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                <button
                  onClick={() => {
                    setEdition("");
                    setShowEditions(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary/50 transition-colors border-b border-border/50"
                >
                  {t.add_car_edition_skip as string}
                </button>
                {editions.map((ed) => (
                  <button
                    key={ed}
                    onClick={() => {
                      setEdition(ed);
                      setShowEditions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors"
                  >
                    {ed}
                  </button>
                ))}
                {editions.length === 0 && !loadingEditions && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">{t.add_car_edition_none as string}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Finitions (optionnel) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_finitions as string}
          </Label>
          <Input
            placeholder={t.add_car_finitions_placeholder as string}
            value={finitions}
            onChange={(e) => setFinitions(e.target.value)}
            className="bg-secondary/30"
          />
        </div>

        {/* Spotting Context */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_spotting_context as string}
          </Label>
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              label={t.add_car_seen_road as string}
              checked={seenOnRoad}
              onChange={(v) => {
                setSeenOnRoad(v);
                if (v) setParked(false);
              }}
            />
            <ToggleChip
              label={t.add_car_parked_label as string}
              checked={parked}
              onChange={(v) => {
                setParked(v);
                if (v) setSeenOnRoad(false);
              }}
            />
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_condition_label as string}
          </Label>
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              label="Stock"
              checked={stock}
              onChange={(v) => {
                setStock(v);
                if (v) setModified(false);
              }}
            />
            <ToggleChip
              label={t.add_car_modified_label as string}
              checked={modified}
              onChange={(v) => {
                setModified(v);
                if (v) setStock(false);
              }}
            />
          </div>
          {modified && (
            <div className="pt-1">
              <Label className="text-xs text-muted-foreground">{t.add_car_modified_comment as string}</Label>
              <textarea
                value={modifiedComment}
                onChange={(e) => setModifiedComment(e.target.value.slice(0, 500))}
                placeholder={t.add_car_modified_placeholder as string}
                maxLength={500}
                className="mt-1 w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm min-h-[80px] resize-y"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-0.5">{modifiedComment.length}/500</p>
            </div>
          )}
        </div>

        {/* Car Meet */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_event as string}
          </Label>
          <div className="flex flex-wrap gap-2">
            <ToggleChip label={t.add_car_car_meet as string} checked={carMeet} onChange={setCarMeet} />
          </div>
        </div>

        {/* Engine */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_engine as string}
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                if (!brand || !model || !year) {
                  toast.error(t.add_car_select_brand_model_year as string);
                  return;
                }
                if (engines.length === 0 && !loadingEngines) {
                  setLoadingEngines(true);
                  try {
                    const data = await callCarApi<{ engines: { name: string; displacement: string; fuel: string; hp: number }[] }>({
                      action: "engines", brand, model, year: parseInt(year), ...(edition ? { edition } : {}),
                    });
                    const list = data.engines ?? [];
                    setEngines(list);
                    if (list.length === 0) toast.info(t.add_car_engine_no_results as string);
                  } catch (err: any) {
                    toast.error(err?.message || (t.add_car_engine_error as string));
                  } finally {
                    setLoadingEngines(false);
                  }
                }
                setShowEngines(!showEngines);
              }}
              disabled={!year}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm",
                !year && "opacity-50 cursor-not-allowed",
                !engine && "text-muted-foreground"
              )}
            >
              {loadingEngines ? (t.add_car_engine_loading as string) : engine || (year ? (t.add_car_engine_select as string) : (t.add_car_engine_select_year as string))}
            </button>
            {showEngines && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                <button
                  onClick={() => {
                    setEngine("");
                    setShowEngines(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                >
                  {t.add_car_engine_skip as string}
                </button>
                {engines.map((eng, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setEngine(`${eng.name} (${eng.hp}hp)`);
                      setShowEngines(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors"
                  >
                    <span className="font-medium">{eng.name}</span>
                    <span className="text-muted-foreground ml-2">{eng.hp}hp • {eng.fuel}</span>
                  </button>
                ))}
                {engines.length === 0 && !loadingEngines && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">{t.add_car_engine_none as string}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_location as string}
          </Label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setLocationMode("gps")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                locationMode === "gps"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/30"
              )}
            >
              <MapPin className="h-4 w-4" />
              {t.add_car_gps_label as string}
            </button>
            <button
              type="button"
              onClick={() => setLocationMode("map")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                locationMode === "map"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/30"
              )}
            >
              <Map className="h-4 w-4" />
              {t.add_car_map_label as string}
            </button>
            <button
              type="button"
              onClick={() => setLocationMode("text")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                locationMode === "text"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/30"
              )}
            >
              <Pencil className="h-4 w-4" />
              {t.add_car_text_label as string}
            </button>
          </div>

          {locationMode === "gps" && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={gettingLocation}
                onClick={() => {
                  setGettingLocation(true);
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      setCoords({ lat, lng });
                      setGettingLocation(false);
                      const name = await reverseGeocode(lat, lng);
                      if (name) setLocationName(name);
                      toast.success(t.add_car_position_saved as string);
                    },
                    () => {
                      setGettingLocation(false);
                      toast.error(t.add_car_position_error as string);
                    }
                  );
                }}
              >
                {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                {t.add_car_use_position as string}
              </Button>
              {coords && (
                <p className="text-xs text-muted-foreground">
                  📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  {locationName && ` · ${locationName}`}
                </p>
              )}
            </div>
          )}

          {locationMode === "map" && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowMapPicker(true)}
              >
                <Map className="h-4 w-4 mr-2" />
                {t.add_car_open_map as string}
              </Button>
              {coords && (
                <p className="text-xs text-muted-foreground">
                  📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  {locationName && ` · ${locationName}`}
                </p>
              )}
            </div>
          )}

          {locationMode === "text" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t.add_car_text_example as string}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder={t.add_car_text_placeholder as string}
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  className="bg-secondary/30 flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLocationSearch())}
                />
                <Button
                  type="button"
                  disabled={!locationSearchQuery.trim() || locationSearchLoading}
                  onClick={handleLocationSearch}
                >
                  {locationSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
                </Button>
              </div>
              {coords && locationName && (
                <p className="text-xs text-muted-foreground">
                  📍 {locationName}
                </p>
              )}
            </div>
          )}

          <LocationMapPicker
            open={showMapPicker}
            onOpenChange={setShowMapPicker}
            initialCenter={coords}
            onSelect={async (lat, lng) => {
              setCoords({ lat, lng });
              const name = await reverseGeocode(lat, lng);
              if (name) setLocationName(name);
              toast.success(t.add_car_location_saved as string);
            }}
          />
        </div>

        {/* Car Condition */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t.add_car_car_condition as string}
          </Label>
          <CarConditionSelector value={carCondition} onChange={setCarCondition} />
        </div>

        {/* Photo (optional, required for delivery) — la plaque est extraite automatiquement de la photo si visible, jamais affichée */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isDeliveryMode ? (t.add_car_photo_required_delivery as string) : (t.add_car_photo_optional as string)}
          </Label>
          {imagePreview ? (
            <PhotoPreview
              imageUrl={imagePreview}
              onRemove={handleRemovePhoto}
              isBlurry={isPhotoBlurry}
              onBlurryChange={setIsPhotoBlurry}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowPhotoDialog(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Camera className="h-5 w-5" />
              <span className="text-sm font-medium">{t.add_car_add_photo as string}</span>
            </button>
          )}
          {(additionalPhotoUrls.length > 0 || additionalPhotoFiles.length > 0) && (
            <div className="flex flex-wrap gap-2 items-center">
              {additionalPhotoUrls.map((url, i) => (
                <div key={`url-${i}`} className="relative rounded-lg overflow-hidden border border-border w-20 h-20">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeAdditionalUrl(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-1 text-white" aria-label="Retirer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {additionalPhotoFiles.map((item, i) => (
                <div key={`file-${i}`} className="relative rounded-lg overflow-hidden border border-border w-20 h-20">
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeAdditionalFile(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-1 text-white" aria-label="Retirer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {additionalPhotoUrls.length + additionalPhotoFiles.length < 4 && (
                <button type="button" onClick={() => setShowExtraPhotoDialog(true)} className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50">
                  <Plus className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
          {imagePreview && additionalPhotoUrls.length + additionalPhotoFiles.length < 4 && (
            <button type="button" onClick={() => setShowExtraPhotoDialog(true)} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
              <Plus className="h-4 w-4" /> {t.add_car_add_photo as string}
            </button>
          )}
          {/* Spot date for gallery photos */}
          {photoSourceType === "gallery" && imagePreview && (
            <div className="space-y-1.5 mt-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t.add_car_spot_date as string}
              </Label>
              <p className="text-xs text-muted-foreground">{t.add_car_spot_date_desc as string}</p>
              <Input
                type="date"
                value={spotDate}
                onChange={(e) => setSpotDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="bg-secondary/30 w-full"
              />
            </div>
          )}
        </div>
        
        <PhotoUploadDialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog} onPhotoSelect={handlePhotoSelect} />
        <PhotoUploadDialog open={showExtraPhotoDialog} onOpenChange={setShowExtraPhotoDialog} onPhotoSelect={(file) => { handleAddExtraPhoto(file); setShowExtraPhotoDialog(false); }} />
      </div>

      {/* Done Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={handleSubmit}
          disabled={!brand || !model || !year || loading}
          className="w-full h-12 text-base font-bold rounded-xl"
        >
          {loading ? (t.loading as string) : (t.add_car_submit as string)}
        </Button>
      </div>
    </div>
  );
};

export default AddCar;
