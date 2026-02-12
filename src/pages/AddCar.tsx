import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { carBrands, getModelsForBrand, getYearsForModel } from "@/data/carData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Check, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [horsepower, setHorsepower] = useState(searchParams.get("horsepower") || "");
  const [locationName, setLocationName] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
    }
  }, [brand]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
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
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("car-photos")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("cars").insert({
        user_id: user.id,
        brand,
        model,
        year: parseInt(year),
        seen_on_road: seenOnRoad,
        parked,
        stock,
        modified,
        car_meet: carMeet,
        image_url: imageUrl,
        horsepower: horsepower ? parseInt(horsepower) : null,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        location_name: locationName || null,
      });

      if (error) throw error;
      toast.success(`${brand} ${model} added to your garage!`);
      navigate("/garage");
    } catch (err: any) {
      toast.error(err.message || "Failed to add car");
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
              label="🔧 Modified"
              checked={modified}
              onChange={(v) => {
                setModified(v);
                if (v) setStock(false);
              }}
            />
          </div>
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

        {/* Horsepower */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Horsepower (optional)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 450"
            value={horsepower}
            onChange={(e) => setHorsepower(e.target.value)}
            className="bg-secondary/30"
          />
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

        {/* Photo (optional) */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Photo (optional)
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur px-3 py-1 text-xs font-medium"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Camera className="h-5 w-5" />
              <span className="text-sm font-medium">Upload a photo</span>
            </button>
          )}
        </div>
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
