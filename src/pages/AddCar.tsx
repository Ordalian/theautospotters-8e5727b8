import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { callCarApi } from "@/lib/carApi";
import { carBrands, getModelsForBrand, getYearsForModel } from "@/data/carData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Check, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhotoUploadDialog, PhotoPreview, type PhotoSourceType } from "@/components/PhotoUpload";
import { CarConditionSelector } from "@/components/CarConditionSelector";
import { 
  type CarCondition, 
  type PhotoSource,
  calculateQualityRating,
  calculateRarityRating 
} from "@/lib/carRatings";

const AddCar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [loading, setLoading] = useState(false);
  const [edition, setEdition] = useState("");
  const [editions, setEditions] = useState<string[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [showEditions, setShowEditions] = useState(false);
  const [engine, setEngine] = useState(searchParams.get("engine") || "");
  const [engines, setEngines] = useState<{ name: string; displacement: string; fuel: string; hp: number }[]>([]);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [showEngines, setShowEngines] = useState(false);
  const [modifiedComment, setModifiedComment] = useState("");
  const [locationName, setLocationName] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // New rating system states
  const [carCondition, setCarCondition] = useState<CarCondition>("good");
  const [photoSourceType, setPhotoSourceType] = useState<PhotoSourceType | null>(null);
  const [isPhotoBlurry, setIsPhotoBlurry] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);

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
    reader.onerror = () => toast.error("Impossible de charger l'image");
    reader.readAsDataURL(file);
    setPhotoSourceType(source);
    setIsPhotoBlurry(false);
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setPhotoSourceType(null);
    setIsPhotoBlurry(false);
  };

  const handleSubmit = async () => {
    if (!user || !brand || !model || !year) {
      toast.error("Please fill in brand, model, and year");
      return;
    }
    setLoading(true);
    try {
      let imageUrl: string | null = imagePreview && !imageFile ? imagePreview : null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("car-photos")
          .upload(path, imageFile);
        if (uploadErr) {
          const storageMsg = uploadErr.message || "Upload failed";
          throw new Error(`Photo: ${storageMsg}`);
        }
        const { data: urlData } = supabase.storage
          .from("car-photos")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
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

      const { error } = await supabase.from("cars").insert({
        user_id: user.id,
        brand,
        model,
        year: parseInt(year),
        edition: edition || null,
        seen_on_road: seenOnRoad,
        parked,
        stock,
        modified,
        modified_comment: modified ? (modifiedComment.trim().slice(0, 500) || null) : null,
        car_meet: carMeet,
        image_url: imageUrl,
        engine: engine || null,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        location_name: locationName || null,
        car_condition: carCondition,
        photo_source: photoSource,
        quality_rating: qualityRating.level,
        rarity_rating: rarityRating.level,
      });

      if (error) {
        const dbMsg = error.message || "Database error";
        const err: any = new Error(dbMsg);
        err.details = error.details;
        err.hint = error.hint;
        throw err;
      }
      toast.success(`${brand} ${model} added to your garage!`);
      navigate("/garage");
    } catch (err: any) {
      const msg =
        err?.message
        ?? err?.error_description
        ?? (typeof err?.details === "string" ? err.details : null)
        ?? (err?.error ? String(err.error) : null)
        ?? "Failed to add car";
      const hint = err?.hint ? ` (${err.hint})` : "";
      toast.error(`${msg}${hint}`);
      console.error("Add car error:", err);
    } finally {
      setLoading(false);
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/garage")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Add a Car</h1>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto pb-32">
        {/* Brand */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Brand</Label>
          <div className="relative">
            <Input
              placeholder="Search brand..."
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
                  <div className="px-4 py-3 text-sm text-muted-foreground">No brands found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Model</Label>
          <div className="relative">
            <Input
              placeholder={brand ? "Search model..." : "Select a brand first"}
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
                  <div className="px-4 py-3 text-sm text-muted-foreground">No models found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Year */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Year</Label>
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
              {year || (model ? "Select year" : "Select a model first")}
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
            Édition / Série limitée (optionnel)
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
                    console.error("car-api editions error:", err);
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
              {loadingEditions ? "Chargement..." : edition || (year ? "Choisir ou ignorer" : "Sélectionnez l'année d'abord")}
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
                  Ignorer / Non connu
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
                  <div className="px-4 py-3 text-sm text-muted-foreground">Aucune édition trouvée</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spotting Context */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Spotting Context
          </Label>
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              label="🛣️ Seen on the road"
              checked={seenOnRoad}
              onChange={(v) => {
                setSeenOnRoad(v);
                if (v) setParked(false);
              }}
            />
            <ToggleChip
              label="🅿️ Parked!"
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
            Condition
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
              label="🔧 Modifié"
              checked={modified}
              onChange={(v) => {
                setModified(v);
                if (v) setStock(false);
              }}
            />
          </div>
          {modified && (
            <div className="pt-1">
              <Label className="text-xs text-muted-foreground">Commentaire (optionnel, 500 car. max)</Label>
              <textarea
                value={modifiedComment}
                onChange={(e) => setModifiedComment(e.target.value.slice(0, 500))}
                placeholder="Décrivez les modifications..."
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
            Event
          </Label>
          <div className="flex flex-wrap gap-2">
            <ToggleChip label="🏁 Car Meet" checked={carMeet} onChange={setCarMeet} />
          </div>
        </div>

        {/* Engine */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Engine (optional)
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                if (!brand || !model || !year) {
                  toast.error("Select brand, model and year first");
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
                    if (list.length === 0) toast.info("Aucun moteur trouvé pour ce modèle");
                  } catch (err: any) {
                    console.error("car-api error:", err);
                    toast.error(err?.message || "Impossible de charger les moteurs");
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
              {loadingEngines ? "Loading engines..." : engine || (year ? "Select engine (optional)" : "Select year first")}
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
                  Skip / Unknown
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
                  <div className="px-4 py-3 text-sm text-muted-foreground">No engines found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Location
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="City, Country..."
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="bg-secondary/30 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={gettingLocation}
              onClick={() => {
                setGettingLocation(true);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGettingLocation(false);
                    toast.success("Location captured!");
                  },
                  () => {
                    setGettingLocation(false);
                    toast.error("Could not get location");
                  }
                );
              }}
            >
              {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            </Button>
          </div>
          {coords && (
            <p className="text-xs text-muted-foreground">
              📍 GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Car Condition */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Car Condition
          </Label>
          <CarConditionSelector value={carCondition} onChange={setCarCondition} />
        </div>

        {/* Photo (optional) */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Photo (optional)
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
              <span className="text-sm font-medium">Add a photo</span>
            </button>
          )}
        </div>
        
        <PhotoUploadDialog
          open={showPhotoDialog}
          onOpenChange={setShowPhotoDialog}
          onPhotoSelect={handlePhotoSelect}
        />
      </div>

      {/* Done Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={handleSubmit}
          disabled={!brand || !model || !year || loading}
          className="w-full h-12 text-base font-bold rounded-xl"
        >
          {loading ? "Adding..." : "Done"}
        </Button>
      </div>
    </div>
  );
};

export default AddCar;
