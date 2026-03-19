import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { callCarApi } from "@/lib/carApi";
import { getRarityFromUnits } from "@/lib/carRatings";
import { ArrowLeft, Car, Loader2, X, Trash2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import GoldParticles from "@/components/GoldParticles";
import { RatingExplainer } from "@/components/RatingExplainer";
import SignedCarImage from "@/components/SignedCarImage";
import { CarLikeButton } from "@/components/CarLikeButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
...
        {car.image_url || allPhotoUrls.length > 0 ? (
          <button
            type="button"
            onClick={() => { setPhotoIndex(0); setPhotoPopupOpen(true); }}
            className={`w-full h-64 overflow-hidden block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary rounded-b-xl relative ${hasLinkedCar ? "ring-2 linked-car-ring ring-offset-2 ring-offset-card shadow-xl" : ""}`}
          >
            <SignedCarImage
              src={allPhotoUrls[0] ?? car.image_url}
              alt={car.generation ? `${car.brand} ${car.model} ${car.generation}` : `${car.brand} ${car.model}`}
              className="h-full w-full object-cover"
              loading="lazy"
              fallback={
                <div className={`flex h-full w-full items-center justify-center ${hasLinkedCar ? "linked-car-section" : "bg-secondary/20"}`}>
                  <Car className={`h-20 w-20 ${hasLinkedCar ? "text-primary/30" : "text-muted-foreground/20"}`} />
                </div>
              }
            />
            {allPhotoUrls.length > 1 && (
              <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span>{allPhotoUrls.length} {t.car_detail_photos as string}</span>
              </span>
            )}
          </button>
        ) : (
...
                >
                  {c.image_url ? (
                    <SignedCarImage
                      src={c.image_url}
                      alt={`${c.brand} ${c.model}`}
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                      fallback={
                        <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                          <Car className="h-6 w-6 text-muted-foreground" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                      <Car className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.brand} {c.model}{(c as { generation?: string | null }).generation ? ` ${(c as { generation?: string | null }).generation}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{c.year}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
...
          <div
            ref={imgContainerRef}
            className="flex items-center justify-center overflow-hidden touch-none select-none"
            style={{ cursor: zoomLevel > 1 ? "grab" : "zoom-in" }}
            onDoubleClick={handlePhotoDoubleClick}
            onWheel={handlePhotoWheel}
            onPointerDown={handlePanPointerDown}
            onPointerMove={handlePanPointerMove}
            onPointerUp={handlePanPointerUp}
            onPointerCancel={handlePanPointerUp}
            onTouchStart={handlePinchStart}
            onTouchMove={handlePinchMove}
            onTouchEnd={handlePinchEnd}
          >
            <SignedCarImage
              src={allPhotoUrls[photoIndex] ?? car.image_url}
              alt={car.generation ? `${car.brand} ${car.model} ${car.generation}` : `${car.brand} ${car.model}`}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain pointer-events-none"
              draggable={false}
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                transition: panStart.current || pinchStart.current ? "none" : "transform 0.2s ease-out",
              }}
              fallback={
                <div className="flex h-[70vh] w-[70vw] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                </div>
              }
            />
          </div>
          {allPhotoUrls.length > 1 && (
            <p className="text-center text-sm text-white/70 pb-2">
              {photoIndex + 1} / {allPhotoUrls.length}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarDetails;
