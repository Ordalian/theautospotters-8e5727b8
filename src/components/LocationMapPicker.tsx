import { useEffect, useRef, useState, useCallback } from "react";
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

// Fix Leaflet default marker icon (broken in bundled environments)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

  // Use a callback ref so we know when the DOM element is actually mounted
  const initMap = useCallback((node: HTMLDivElement | null) => {
    // Clean up previous map if any
    if (mapInstance.current) {
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    if (!node || !open) return;

    mapContainerRef.current = node;

    const [lat, lng] = initialCenter
      ? [initialCenter.lat, initialCenter.lng]
      : DEFAULT_CENTER;

    const map = L.map(node, {
      center: [lat, lng],
      zoom: DEFAULT_ZOOM,
      tap: false, // allow click/tap to select place instead of being consumed by Leaflet's tap-zoom
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      markerRef.current?.remove();
      markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
      setSelected({ lat: clickLat, lng: clickLng });
    });

    mapInstance.current = map;

    if (initialCenter) {
      setSelected(initialCenter);
      markerRef.current = L.marker([initialCenter.lat, initialCenter.lng]).addTo(map);
    } else {
      setSelected(null);
    }

    // Leaflet needs size recalc after the dialog finishes its animation
    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => map.invalidateSize(), 300);
  }, [open, initialCenter?.lat, initialCenter?.lng]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open && mapInstance.current) {
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstance.current.remove();
      mapInstance.current = null;
      setSelected(null);
    }
  }, [open]);

  const handleValidate = () => {
    if (selected) {
      onSelect(selected.lat, selected.lng);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t.location_choose_title as string}</DialogTitle>
        </DialogHeader>
        {open && (
          <div
            ref={initMap}
            className="w-full h-[320px] rounded-b-lg relative z-[60]"
            style={{ pointerEvents: "auto" }}
          />
        )}
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
