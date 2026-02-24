import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, Brain, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callCarApi } from "@/lib/carApi";
import { resizeImage, blurPlateInImage, dataUrlToFile } from "@/lib/imageUtils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { PhotoUploadDialog, type PhotoSourceType } from "@/components/PhotoUpload";

interface CarResult {
  brand: string;
  model: string;
  year: string;
  confidence: number;
}

interface IdentifyAndPlateResult extends CarResult {
  license_plate: string | null;
  plate_bbox?: { x: number; y: number; width: number; height: number } | null;
  vehicle_type?: string;
}

const VEHICLE_TYPE_LABEL_KEYS: Record<string, string> = {
  car: "garage_menu_cars",
  truck: "garage_menu_trucks",
  motorcycle: "garage_menu_motorcycles",
  boat: "garage_menu_boats",
  plane: "garage_menu_planes",
  train: "garage_menu_trains",
  hot_wheels: "garage_menu_hot_wheels",
};

const AutoSpotter = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDeliveryMode = searchParams.get("delivery") === "1";
  const isOwnedMode = searchParams.get("owned") === "1";
  const { user } = useAuth();
  const { t } = useLanguage();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CarResult | null>(null);
  const [extractedPlate, setExtractedPlate] = useState<string | null>(null);
  const [plateBbox, setPlateBbox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [vehicleType, setVehicleType] = useState<string>("car");
  const [showCorrect, setShowCorrect] = useState(false);
  const [correctBrand, setCorrectBrand] = useState("");
  const [correctModel, setCorrectModel] = useState("");
  const [correctYear, setCorrectYear] = useState("");
  const [primaryPhotoSourceType, setPrimaryPhotoSourceType] = useState<PhotoSourceType | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [savingOwned, setSavingOwned] = useState(false);

  const handlePhotoSelect = (file: File, source: PhotoSourceType) => {
    if (images.length >= 4) {
      toast.error(t.autospotter_max_photos as string);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImages((prev) => [...prev, { file, preview: dataUrl }]);
    };
    reader.onerror = () => toast.error(t.error as string);
    reader.readAsDataURL(file);
    if (!primaryPhotoSourceType) {
      setPrimaryPhotoSourceType(source);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      toast.error(t.autospotter_add_photos as string);
      return;
    }
    setAnalyzing(true);
    setResult(null);
    setExtractedPlate(null);
    setPlateBbox(null);
    setVehicleType("car");
    try {
      const base64Images = await Promise.all(
        images.map((img) => resizeImage(img.file, 800, 0.7))
      );

      const data = await callCarApi<IdentifyAndPlateResult>({ action: "identify_and_extract_plate", images: base64Images });
      setResult({ brand: data.brand, model: data.model, year: data.year, confidence: data.confidence });
      const plate = data.license_plate?.replace(/\s|-|\./g, "").toUpperCase().slice(0, 20);
      if (plate && plate.length >= 2) setExtractedPlate(plate);
      if (data.plate_bbox) setPlateBbox(data.plate_bbox);
      else setPlateBbox(null);
      const validTypes = ["car", "truck", "motorcycle", "boat", "plane", "train", "hot_wheels"];
      const rawType = typeof data.vehicle_type === "string" ? data.vehicle_type.trim().toLowerCase() : "";
      if (rawType && validTypes.includes(rawType)) setVehicleType(rawType);
      else setVehicleType("car");
    } catch (err: any) {
      const msg = err?.message || "Reconnaissance impossible.";
      const isGeneric = /non-2xx|encountered an error/i.test(msg);
      toast.error(isGeneric ? (t.autospotter_api_error as string) : msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadAllImagesAndNavigate = async (brand: string, model: string, year: string) => {
    const uploadedUrls: string[] = [];
    if (images.length > 0 && user) {
      const base = `${user.id}/${Date.now()}`;
      for (let i = 0; i < images.length; i++) {
        try {
          let fileToUpload = images[i].file;
          if (i === 0 && plateBbox && images[0].preview.startsWith("data:")) {
            try {
              const blurredDataUrl = await blurPlateInImage(images[0].preview, plateBbox);
              fileToUpload = dataUrlToFile(blurredDataUrl, fileToUpload.name.replace(/\.[^.]+$/i, ".jpg") || "photo.jpg");
            } catch {
              /* keep original on blur error */
            }
          }
          const ext = fileToUpload.name.split(".").pop() || "jpg";
          const path = i === 0 ? `${base}.${ext}` : `${base}-${i}.${ext}`;
          await supabase.storage.from("car-photos").upload(path, fileToUpload);
          const { data } = supabase.storage.from("car-photos").getPublicUrl(path);
          uploadedUrls.push(data.publicUrl);
        } catch {
          // skip failed upload
        }
      }
    }

    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (year) params.set("year", year);
    if (uploadedUrls[0]) params.set("image_url", uploadedUrls[0]);
    for (let i = 1; i < uploadedUrls.length; i++) {
      params.set(`photo_${i}`, uploadedUrls[i]);
    }
    if (primaryPhotoSourceType) params.set("photo_source_type", primaryPhotoSourceType);
    if (isDeliveryMode) params.set("delivery", "1");
    if (extractedPlate) params.set("extracted_plate", extractedPlate);
    params.set("vehicle_type", vehicleType);
    navigate(`/add-car?${params.toString()}`);
  };

  const handleAddToGarage = () => {
    if (result) {
      uploadAllImagesAndNavigate(result.brand, result.model, result.year);
    }
  };

  const handleCorrectSubmit = () => {
    uploadAllImagesAndNavigate(correctBrand, correctModel, correctYear);
  };

  const handleSaveAsOwnedVehicle = async () => {
    if (!user) return;
    const plate = extractedPlate;
    if (!plate || plate.length < 2) {
      toast.error(t.autospotter_no_plate as string);
      return;
    }
    setSavingOwned(true);
    try {
      const { error } = await supabase.from("owned_vehicles").insert({
        user_id: user.id,
        license_plate: plate,
        car_id: null,
      });
      if (error) throw error;
      toast.success(t.autospotter_registered as string);
      navigate("/profile");
    } catch (e: any) {
      toast.error(e?.message ?? (t.error as string));
    } finally {
      setSavingOwned(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate(isOwnedMode ? "/profile" : isDeliveryMode ? "/friends" : "/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{isOwnedMode ? (t.autospotter_my_vehicle as string) : (t.autospotter_title as string)}</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Info */}
        <div className="flex items-center gap-3 rounded-xl bg-accent/10 border border-accent/20 p-4">
          <Brain className="h-8 w-8 text-accent shrink-0" />
          <p className="text-sm text-muted-foreground">{t.autospotter_info as string}</p>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
              <img src={img.preview} alt={`Car ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {images.length < 4 && (
            <>
              <button
                onClick={() => setShowPhotoDialog(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">{t.autospotter_add_photo as string}</span>
              </button>
              <PhotoUploadDialog
                open={showPhotoDialog}
                onOpenChange={setShowPhotoDialog}
                onPhotoSelect={handlePhotoSelect}
              />
            </>
          )}
        </div>

        {/* Analyze Button */}
        {!result && (
          <Button
            onClick={analyzeImages}
            disabled={images.length === 0 || analyzing}
            className="w-full h-12 text-base font-bold rounded-xl gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.autospotter_analyzing as string}
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                {t.autospotter_analyze as string}
              </>
            )}
          </Button>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">{t.autospotter_ai_identified as string}</p>
              <h3 className="text-2xl font-bold">
                {result.brand} {result.model}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.autospotter_year as string}: {result.year} • {t.autospotter_confidence as string}: {Math.round(result.confidence * 100)}%
                {VEHICLE_TYPE_LABEL_KEYS[vehicleType] && (
                  <> • {t.autospotter_vehicle_type as string}: {t[VEHICLE_TYPE_LABEL_KEYS[vehicleType]] as string}</>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {isOwnedMode ? (
                <Button
                  onClick={handleSaveAsOwnedVehicle}
                  disabled={!extractedPlate || savingOwned}
                  className="w-full h-11 font-bold rounded-xl gap-2"
                >
                  {savingOwned ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t.autospotter_save_vehicle as string}
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleAddToGarage} className="flex-1 h-11 font-bold rounded-xl gap-2">
                    <Plus className="h-4 w-4" />
                    {t.autospotter_add_to_garage as string}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCorrect(true)}
                    className="flex-1 h-11 font-bold rounded-xl"
                  >
                    {t.autospotter_correct as string}
                  </Button>
                </div>
              )}
              {isOwnedMode && (
                <Button variant="outline" onClick={() => uploadAllImagesAndNavigate(result.brand, result.model, result.year)} className="w-full h-11 font-bold rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  {t.autospotter_add_garage_too as string}
                </Button>
              )}
            </div>

            {showCorrect && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t.autospotter_correct_question as string}</p>
                <Input
                  placeholder={t.add_car_brand as string}
                  value={correctBrand}
                  onChange={(e) => setCorrectBrand(e.target.value)}
                  className="bg-secondary/30"
                />
                <Input
                  placeholder={t.add_car_model as string}
                  value={correctModel}
                  onChange={(e) => setCorrectModel(e.target.value)}
                  className="bg-secondary/30"
                />
                <Input
                  placeholder={t.add_car_year as string}
                  value={correctYear}
                  onChange={(e) => setCorrectYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCorrectSubmit()}
                  className="bg-secondary/30"
                />
                <Button onClick={handleCorrectSubmit} className="w-full font-bold rounded-xl">
                  {t.autospotter_done as string}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoSpotter;
