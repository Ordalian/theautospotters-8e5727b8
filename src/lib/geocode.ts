/**
 * Géocodage via Nominatim (OpenStreetMap). Pas de clé API.
 * Gère aussi "entre X et Y" → point médian entre deux lieux.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const HEADERS = { "Accept": "application/json", "Accept-Language": "fr" };
const USER_AGENT = "TheAutoSpotters/1.0 (car spotting app)";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

async function fetchNominatim(q: string): Promise<{ lat: string; lon: string; display_name: string }[]> {
  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "5",
    addressdetails: "0",
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { ...HEADERS, "User-Agent": USER_AGENT },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Recherche un lieu et retourne le premier résultat (centre ville / lieu).
 */
export async function searchPlace(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const results = await fetchNominatim(trimmed);
  const first = results[0];
  if (!first) return null;
  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    displayName: first.display_name,
  };
}

/**
 * Détecte "entre X et Y" / "route entre X et Y" et retourne le point médian + un libellé.
 * Sinon, géocode la requête comme un seul lieu.
 */
export async function searchPlaceOrMidpoint(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const entreMatch = trimmed.match(/^(?:route\s+)?entre\s+(.+?)\s+et\s+(.+)$/i)
    || trimmed.match(/^(.+?)\s+et\s+(.+)$/i);
  if (entreMatch) {
    const [, a, b] = entreMatch;
    const placeA = a?.trim();
    const placeB = b?.trim();
    if (placeA && placeB) {
      const [resA, resB] = await Promise.all([
        fetchNominatim(placeA),
        fetchNominatim(placeB),
      ]);
      const firstA = resA[0];
      const firstB = resB[0];
      if (firstA && firstB) {
        const latA = parseFloat(firstA.lat);
        const lngA = parseFloat(firstA.lon);
        const latB = parseFloat(firstB.lat);
        const lngB = parseFloat(firstB.lon);
        return {
          lat: (latA + latB) / 2,
          lng: (lngA + lngB) / 2,
          displayName: `${placeA} – ${placeB}`,
        };
      }
    }
  }

  return searchPlace(trimmed);
}

/**
 * Reverse géocodage : coordonnées → nom du lieu.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { ...HEADERS, "User-Agent": USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.display_name ?? null;
}
