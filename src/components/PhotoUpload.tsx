import { useState, useRef, useEffect } from "react";
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
  const [mode, setMode] = useState<"choice" | "camera">("choice");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      setMode("choice");
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const openGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("multiple", "false");
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
    } catch {
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (mode !== "camera" || !streamRef.current) return;
    const video = videoRef.current;
    if (video) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [mode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        stopCamera();
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          onPhotoSelect(file, "camera");
          onOpenChange(false);
        }
        setMode("choice");
      },
      "image/jpeg",
      0.9
    );
  };

  const backFromCamera = () => {
    stopCamera();
    setMode("choice");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none sm:max-w-md sm:h-auto sm:max-h-[90vh] sm:rounded-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "camera" ? (t.photo_take_title as string) : (t.photo_add_title as string)}
          </DialogTitle>
          <DialogDescription>
            {mode === "choice"
              ? (t.photo_choice_desc as string)
              : (t.photo_camera_desc as string)}
          </DialogDescription>
        </DialogHeader>

        {mode === "choice" ? (
          <div className="grid gap-3 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-primary"
              onClick={startCamera}
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
              onClick={openGallery}
            >
              <Image className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">{t.photo_gallery_label as string}</div>
                <div className="text-xs text-muted-foreground">{t.photo_gallery_quality as string}</div>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={backFromCamera} className="flex-1">
                <X className="h-4 w-4 mr-1" />
                {t.photo_back as string}
              </Button>
              <Button type="button" onClick={capturePhoto} className="flex-1">
                <Camera className="h-4 w-4 mr-1" />
                {t.photo_capture as string}
              </Button>
            </div>
          </div>
        )}
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
