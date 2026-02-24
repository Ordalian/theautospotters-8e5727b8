import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

const DEFAULT_CENTER: [number, number] = [50.45, 3.43];
const DEFAULT_ZOOM = 10;

interface LocationMapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCenter?: { lat: number; lng: number } | null;
  onSelect: (lat: number, lng: number) => void;
}

export function LocationMapPicker({
  open,
  onOpenChange,
  initialCenter,
  onSelect,
}: LocationMapPickerProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!open || !mapRef.current) return;

    const [lat, lng] = initialCenter
      ? [initialCenter.lat, initialCenter.lng]
      : DEFAULT_CENTER;
    const map = L.map(mapRef.current, { center: [lat, lng], zoom: DEFAULT_ZOOM });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      markerRef.current?.remove();
      markerRef.current = L.marker([lat, lng]).addTo(map);
      setSelected({ lat, lng });
    });

    mapInstance.current = map;
    setSelected(initialCenter ?? null);
    if (initialCenter) {
      markerRef.current?.remove();
      markerRef.current = L.marker([initialCenter.lat, initialCenter.lng]).addTo(map);
    }

    // Leaflet needs a size recalc after the dialog finishes rendering
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapInstance.current = null;
      setSelected(null);
    };
  }, [open, initialCenter?.lat, initialCenter?.lng]);

  const handleValidate = () => {
    if (selected) {
      onSelect(selected.lat, selected.lng);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t.location_choose_title as string}</DialogTitle>
        </DialogHeader>
        <div ref={mapRef} className="w-full h-[320px] rounded-b-lg" />
        <div className="p-4 flex justify-between items-center border-t">
          <span className="text-sm text-muted-foreground">
            {selected
              ? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`
              : (t.location_click_instruction as string)}
          </span>
          <Button onClick={handleValidate} disabled={!selected}>
            {t.location_validate as string}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
