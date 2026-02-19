import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Brain, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PhotoUploadDialog, type PhotoSourceType } from "@/components/PhotoUpload";

interface CarResult {
  brand: string;
  model: string;
  year: string;
  confidence: number;
}

const AutoSpotter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CarResult | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [correctBrand, setCorrectBrand] = useState("");
  const [correctModel, setCorrectModel] = useState("");
  const [correctYear, setCorrectYear] = useState("");
  // Source de la première photo (camera ou galerie) pour le système de points
  const [primaryPhotoSourceType, setPrimaryPhotoSourceType] = useState<PhotoSourceType | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);

  const handlePhotoSelect = (file: File, source: PhotoSourceType) => {
    if (images.length >= 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }
    const newImage = {
      file,
      preview: URL.createObjectURL(file),
    };
    setImages((prev) => [...prev, newImage]);
    // On utilise la source de la première photo pour le calcul des points plus tard
    if (!primaryPhotoSourceType) {
      setPrimaryPhotoSourceType(source);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      toast.error("Please add at least one image");
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      // Convert images to base64
      const base64Images = await Promise.all(
        images.map(
          (img) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(img.file);
            })
        )
      );

      const { data, error } = await supabase.functions.invoke("identify-car", {
        body: { images: base64Images },
      });

      if (error) {
        const msg = (data as { error?: string })?.error || error.message;
        throw new Error(msg);
      }
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      setResult(data as CarResult);
    } catch (err: any) {
      toast.error(err.message || "Reconnaissance impossible. Vérifiez la clé API (voir ci-dessous).");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadFirstImageAndNavigate = async (brand: string, model: string, year: string) => {
    let imageUrl: string | null = null;
    if (images.length > 0 && user) {
      try {
        const file = images[0].file;
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        await supabase.storage.from("car-photos").upload(path, file);
        const { data } = supabase.storage.from("car-photos").getPublicUrl(path);
        imageUrl = data.publicUrl;
      } catch {
        // Continue without image
      }
    }

    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (year) params.set("year", year);
    if (imageUrl) params.set("image_url", imageUrl);
    if (primaryPhotoSourceType) params.set("photo_source_type", primaryPhotoSourceType);
    navigate(`/add-car?${params.toString()}`);
  };

  const handleAddToGarage = () => {
    if (result) {
      uploadFirstImageAndNavigate(result.brand, result.model, result.year);
    }
  };

  const handleCorrectSubmit = () => {
    uploadFirstImageAndNavigate(correctBrand, correctModel, correctYear);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">The AutoSpotter</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Info */}
        <div className="flex items-center gap-3 rounded-xl bg-accent/10 border border-accent/20 p-4">
          <Brain className="h-8 w-8 text-accent shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>Ajoutez jusqu’à 4 photos : l’IA identifiera la voiture.</p>
            <p className="mt-1 text-xs opacity-80">Clé requise : ajoutez <strong>GEMINI_API_KEY</strong> dans Supabase (Edge Functions → identify-car → Secrets). Clé gratuite : <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com/apikey</a></p>
          </div>
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
                <span className="text-xs font-medium">Add photo</span>
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
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Identify this car
              </>
            )}
          </Button>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">AI identified:</p>
              <h3 className="text-2xl font-bold">
                {result.brand} {result.model}
              </h3>
              <p className="text-sm text-muted-foreground">
                Year: {result.year} • Confidence: {Math.round(result.confidence * 100)}%
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleAddToGarage} className="flex-1 h-11 font-bold rounded-xl gap-2">
                <Plus className="h-4 w-4" />
                Add to my garage
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCorrect(true)}
                className="flex-1 h-11 font-bold rounded-xl"
              >
                Correct me
              </Button>
            </div>

            {showCorrect && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-medium">What's the correct car?</p>
                <Input
                  placeholder="Brand"
                  value={correctBrand}
                  onChange={(e) => setCorrectBrand(e.target.value)}
                  className="bg-secondary/30"
                />
                <Input
                  placeholder="Model"
                  value={correctModel}
                  onChange={(e) => setCorrectModel(e.target.value)}
                  className="bg-secondary/30"
                />
                <Input
                  placeholder="Year"
                  value={correctYear}
                  onChange={(e) => setCorrectYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCorrectSubmit()}
                  className="bg-secondary/30"
                />
                <Button onClick={handleCorrectSubmit} className="w-full font-bold rounded-xl">
                  Done
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
