import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CardCondition } from "@/data/gameCards";

export const CARD_IMAGES_BUCKET = "card-images";

/**
 * Build a storage key from brand + model (e.g. "Toyota" + "Corolla" → "toyota-corolla").
 */
export function getCardImageKey(brand: string, model: string): string {
  const slug = `${brand}-${model}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "unknown";
}

/**
 * Public URL for a card image in Supabase Storage.
 * Path: {key}.png (pixel-art garage images).
 */
export function getCardImageUrl(key: string): string {
  const path = `${key}.png`;
  const { data } = supabase.storage.from(CARD_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * CSS filter strings applied to the <img> per condition.
 */
export const CONDITION_IMAGE_FILTERS: Record<CardCondition, string> = {
  damaged: "saturate(0.25) brightness(0.80) contrast(0.90)",
  average: "saturate(0.75) sepia(0.15) brightness(0.95)",
  good: "none",
  perfect: "brightness(1.08) contrast(1.05) saturate(1.1)",
};

export interface UseCardImageResult {
  url: string;
  loaded: boolean;
  error: boolean;
}

/**
 * Hook: resolve URL and load state for a card image by key.
 */
export function useCardImage(key: string): UseCardImageResult {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = getCardImageUrl(key);

  useEffect(() => {
    if (!key) {
      setLoaded(false);
      setError(true);
      return;
    }
    setLoaded(false);
    setError(false);
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
    img.src = url;
  }, [key, url]);

  return { url, loaded, error };
}
