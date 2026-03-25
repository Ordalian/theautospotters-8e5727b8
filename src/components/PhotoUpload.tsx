import { useEffect } from "react";
import { Camera, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export type PhotoSourceType = "camera" | "gallery";

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoSelect: (file: File, source: PhotoSourceType) => void;
}

export function PhotoUploadDialog({ open, onOpenChange, onPhotoSelect }: PhotoUploadDialogProps) {
  const { t } = useLanguage();

  useEffect(() => {
    // nothing to clean up
  }, [open]);

  const openFileInput = (capture: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) {
      input.setAttribute("capture", "environment");
    }
    input.setAttribute("multiple", "false");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onPhotoSelect(file, capture ? "camera" : "gallery");
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
      <DialogContent className="w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none sm:max-w-md sm:h-auto sm:max-h-[90vh] sm:rounded-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.photo_add_title as string}</DialogTitle>
          <DialogDescription>{t.photo_choice_desc as string}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary"
            onClick={() => openFileInput(true)}
          >
            <Camera className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">{t.photo_camera_label as string}</div>
              <div className="text-xs text-muted-foreground">{t.photo_camera_quality as string}</div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary"
            onClick={() => openFileInput(false)}
          >
            <Image className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">{t.photo_gallery_label as string}</div>
              <div className="text-xs text-muted-foreground">{t.photo_gallery_quality as string}</div>
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
  const { t } = useLanguage();

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
            {t.photo_clear as string}
          </button>
          <button
            onClick={() => onBlurryChange(true)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isBlurry
                ? "bg-primary text-primary-foreground"
                : "bg-background/70 backdrop-blur text-foreground hover:bg-background/90"
            }`}
          >
            {t.photo_blurry as string}
          </button>
        </div>
      )}
    </div>
  );
}
