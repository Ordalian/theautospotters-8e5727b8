import { useState } from "react";
import { Camera, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PhotoSourceType = "camera" | "gallery";

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoSelect: (file: File, source: PhotoSourceType) => void;
}

export function PhotoUploadDialog({ open, onOpenChange, onPhotoSelect }: PhotoUploadDialogProps) {
  const handleFileSelect = (source: PhotoSourceType) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    // Sur mobile : ouvre la caméra arrière (ou galerie selon le choix utilisateur)
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    }

    const cleanup = () => {
      input.remove();
    };

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onPhotoSelect(file, source);
        onOpenChange(false);
      }
      cleanup();
    };

    input.oncancel = cleanup;
    document.body.appendChild(input);
    input.click();
    // Retrait après un court délai si aucun choix (certains navigateurs ne déclenchent pas cancel)
    setTimeout(cleanup, 30000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une photo</DialogTitle>
          <DialogDescription>
            Prendre une photo avec l’appareil ou choisir depuis la galerie
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary"
            onClick={() => handleFileSelect("camera")}
          >
            <Camera className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Prendre une photo</div>
              <div className="text-xs text-muted-foreground">Ouvre la caméra du téléphone (+3 qualité)</div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary"
            onClick={() => handleFileSelect("gallery")}
          >
            <Image className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Galerie</div>
              <div className="text-xs text-muted-foreground">Choisir une photo existante (+2 qualité)</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PhotoPreviewProps {
  imageUrl: string;
  onRemove: () => void;
  isBlurry?: boolean;
  onBlurryChange?: (isBlurry: boolean) => void;
}

export function PhotoPreview({ imageUrl, onRemove, isBlurry = false, onBlurryChange }: PhotoPreviewProps) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-border">
      <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
      
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur p-2 hover:bg-background transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {onBlurryChange && (
        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
          <button
            onClick={() => onBlurryChange(false)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !isBlurry
                ? "bg-primary text-primary-foreground"
                : "bg-background/70 backdrop-blur text-foreground hover:bg-background/90"
            }`}
          >
            Clear (+1)
          </button>
          <button
            onClick={() => onBlurryChange(true)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isBlurry
                ? "bg-primary text-primary-foreground"
                : "bg-background/70 backdrop-blur text-foreground hover:bg-background/90"
            }`}
          >
            Blurry
          </button>
        </div>
      )}
    </div>
  );
}
