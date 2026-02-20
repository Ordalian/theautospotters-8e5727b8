import { useRef } from "react";
import { Image, X } from "lucide-react";
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

/**
 * Un seul bouton « Choisir une photo » : ouvre le sélecteur du téléphone (caméra ou galerie)
 * une seule fois, sans redemander « galerie » après avoir choisi galerie dans l'app.
 */
export function PhotoUploadDialog({ open, onOpenChange, onPhotoSelect }: PhotoUploadDialogProps) {
  const openPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onPhotoSelect(file, "gallery");
        onOpenChange(false);
      }
      input.remove();
    };
    input.oncancel = () => input.remove();
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une photo</DialogTitle>
          <DialogDescription>
            Le téléphone ouvrira directement le sélecteur (caméra ou galerie) une seule fois.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Button
            type="button"
            className="w-full h-24 flex flex-col gap-2"
            onClick={openPicker}
          >
            <Image className="h-8 w-8" />
            <span className="font-semibold">Choisir une photo</span>
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
