import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

function parseEngines(text: string): { name: string; displacement: string; fuel: string; hp: number }[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((e: any) => e && typeof e.name === "string" && typeof e.hp === "number" && e.hp >= 30 && e.hp <= 2000)
        .map((e: any) => ({
          name: String(e.name || ""),
          displacement: String(e.displacement ?? e.name ?? ""),
          fuel: String(e.fuel || "Petrol"),
          hp: Number(e.hp),
        }))
        .slice(0, 15);
    }
  } catch { /* ignore */ }
  return [];
}

const AI_MODELS = [
  { name: "google/gemini-2.5-flash", useMaxTokens: true },
  { name: "openai/gpt-5-mini", useMaxTokens: false },
];

async function callAI(apiKey: string, messages: { role: string; content: string | object[] }[]): Promise<string> {
  for (const model of AI_MODELS) {
    const body: Record<string, unknown> = { model: model.name, messages };
    if (model.useMaxTokens) {
      body.temperature = 0.4;
      body.max_tokens = 1024;
    } else {
      body.max_completion_tokens = 8192;
    }

    console.log("Trying AI model:", model.name);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error(`Model ${model.name} failed:`, response.status, t);
      if (response.status === 429) throw new Error("Rate limit exceeded, please try again later.");
      if (response.status === 402) throw new Error("AI credits exhausted.");
      if (response.status >= 500) continue;
      throw new Error(`AI gateway error (${response.status}): ${t}`);
    }

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();
    if (content) return content;
    console.warn(`Model ${model.name} returned empty content, trying next...`);
  }
  throw new Error("All AI models failed or returned empty content.");
}

// ── Wikipedia fetch ──────────────────────────────────────────────────

async function fetchWikipediaContent(brand: string, model: string): Promise<{ text: string; lang: string } | null> {
  const query = `${brand} ${model}`;
  const userAgent = "TheAutoSpotters/1.0 (car-api edge function)";

  for (const lang of ["fr", "en"]) {
    try {
      // Step 1: search
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`;
      const searchRes = await fetch(searchUrl, { headers: { "User-Agent": userAgent } });
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const results = searchData?.query?.search;
      if (!results?.length) continue;

      // Pick best title (prefer one containing brand or model name)
      const brandLower = brand.toLowerCase();
      const modelLower = model.toLowerCase();
      const best = results.find((r: any) => {
        const t = r.title.toLowerCase();
        return t.includes(brandLower) || t.includes(modelLower);
      }) || results[0];

      // Step 2: get extract
      const extractUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&exlimit=1&titles=${encodeURIComponent(best.title)}&format=json`;
      const extractRes = await fetch(extractUrl, { headers: { "User-Agent": userAgent } });
      if (!extractRes.ok) continue;
      const extractData = await extractRes.json();
      const pages = extractData?.query?.pages;
      if (!pages) continue;

      const page = Object.values(pages)[0] as any;
      const extract = page?.extract;
      if (!extract || extract.length < 100) continue;

      // Truncate to ~4000 chars to fit in prompt
      const truncated = extract.length > 4000 ? extract.slice(0, 4000) + "…" : extract;
      console.log(`Wikipedia: found article "${best.title}" (${lang}), ${extract.length} chars`);
      return { text: truncated, lang };
    } catch (e) {
      console.warn(`Wikipedia ${lang} search failed:`, e);
    }
  }

  console.log("Wikipedia: no article found for", query);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errResponse("Missing authorization header.", 401);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return errResponse("Unauthorized.", 401);
    }

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      return errResponse("LOVABLE_API_KEY missing.", 500);
    }

    const body = await req.json();

    // —— action: identify (image recognition) ——
    if (body.action === "identify") {
      const images = body.images;
      if (!images?.length) return errResponse("No images provided.", 400);

      const contentParts: object[] = [];
      for (const img of images) {
        const m = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (m) {
          contentParts.push({ type: "image_url", image_url: { url: img } });
        }
      }
      contentParts.push({
        type: "text",
        text: `You are an expert vehicle identifier. Analyze the provided image(s). The image can show: a car, a truck, a motorcycle, a boat, a plane, a train, or a Hot Wheels (or similar) toy/die-cast model.

1. Identify the vehicle: brand/manufacturer, model name, approximate year.
2. Classify the type in "vehicle_type" with exactly one of: car, truck, motorcycle, boat, plane, train, hot_wheels.

IMPORTANT – distinguish cars from trucks:
- Use "car" ONLY for passenger vehicles: sedans, hatchbacks, station wagons, coupes, convertibles, SUVs, crossovers, minivans/MPVs. These are for carrying people first.
- Use "truck" for: pickup trucks (e.g. Ford F-150, Ram), lorries, semi-trucks, heavy goods vehicles, box trucks, flatbeds, any vehicle with an open cargo bed or designed primarily for cargo. Pickups are trucks, not cars.

Other types: "motorcycle" for motorbikes; "boat" for boats/ships; "plane" for aircraft; "train" for trains/rail; "hot_wheels" for toy/die-cast models (e.g. Hot Wheels, Matchbox).

Respond ONLY with a JSON object (no markdown): {"brand": "Brand Name", "model": "Model Name", "year": "2024", "confidence": 0.85, "vehicle_type": "car"}`,
      });

      const text = await callAI(API_KEY, [{ role: "user", content: contentParts }]);
      const validTypes = ["car", "truck", "motorcycle", "boat", "plane", "train", "hot_wheels"];
      let parsed: { brand: string; model: string; year: string; confidence: number; vehicle_type: string };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const raw = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        const vt = validTypes.includes(raw?.vehicle_type) ? raw.vehicle_type : "car";
        parsed = {
          brand: raw.brand ?? "Unknown",
          model: raw.model ?? "Unknown",
          year: String(raw.year ?? "2024"),
          confidence: Number(raw.confidence) ?? 0.3,
          vehicle_type: vt,
        };
      } catch {
        parsed = { brand: "Unknown", model: "Unknown", year: "2024", confidence: 0.3, vehicle_type: "car" };
      }
      return jsonResponse(parsed);
    }

    // —— action: extract_plate (extract license plate from car image, never shown to user) ——
    if (body.action === "extract_plate") {
      const images = body.images;
      if (!images?.length) return jsonResponse({ license_plate: null, plate_bbox: null });

      const contentParts: object[] = [];
      for (const img of images.slice(0, 2)) {
        const m = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (m) contentParts.push({ type: "image_url", image_url: { url: img } });
      }
      contentParts.push({
        type: "text",
        text: `You are an expert at reading license plates. Look at the vehicle image(s). If a license plate is visible:
1. Extract ONLY the plate characters (letters and numbers). Use uppercase. Remove spaces, dashes, and dots. Put in "plate".
2. Give the approximate position of the license plate in the image as normalized coordinates (0 to 1). "plate_bbox" must be: {"x": number, "y": number, "width": number, "height": number} where x,y is the top-left corner (0=left, 0=top), width and height are the rectangle size. Example: {"x": 0.2, "y": 0.78, "width": 0.3, "height": 0.06}.

If no plate is visible or readable, respond with: {"plate": null, "plate_bbox": null}
Otherwise respond ONLY with a JSON object: {"plate": "AB123CD", "plate_bbox": {"x": ..., "y": ..., "width": ..., "height": ...}}. No markdown.`,
      });

      const text = await callAI(API_KEY, [{ role: "user", content: contentParts }]);
      let license_plate: string | null = null;
      let plate_bbox: { x: number; y: number; width: number; height: number } | null = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        const p = (parsed.plate ?? parsed.license_plate ?? "").toString().trim();
        if (p && p.toLowerCase() !== "null" && /^[A-Z0-9]{2,12}$/i.test(p.replace(/\s/g, ""))) {
          license_plate = p.replace(/\s|-|\./g, "").toUpperCase().slice(0, 20);
        }
        const b = parsed.plate_bbox;
        if (b && typeof b.x === "number" && typeof b.y === "number" && typeof b.width === "number" && typeof b.height === "number") {
          const x = Math.max(0, Math.min(1, b.x));
          const y = Math.max(0, Math.min(1, b.y));
          const w = Math.max(0.02, Math.min(1, b.width));
          const h = Math.max(0.02, Math.min(1, b.height));
          plate_bbox = { x, y, width: w, height: h };
        }
      } catch { /* keep nulls */ }
      return jsonResponse({ license_plate, plate_bbox });
    }

    // —— action: identify_and_extract_plate (car + plate in one call for "owned vehicle" flow) ——
    if (body.action === "identify_and_extract_plate") {
      const images = body.images;
      if (!images?.length) return errResponse("No images provided.", 400);

      const contentParts: object[] = [];
      for (const img of images) {
        const m = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (m) contentParts.push({ type: "image_url", image_url: { url: img } });
      }
      contentParts.push({
        type: "text",
        text: `You are an expert vehicle identifier and license plate reader. From the image(s):

1. Classify the type in "vehicle_type" with exactly one of: car, truck, motorcycle, boat, plane, train, hot_wheels.

IMPORTANT – distinguish cars from trucks:
- Use "car" ONLY for passenger vehicles: sedans, hatchbacks, station wagons, coupes, convertibles, SUVs, crossovers, minivans/MPVs (people first).
- Use "truck" for pickup trucks (e.g. F-150, Silverado, Ram), lorries, semi-trucks, heavy goods vehicles, box trucks, flatbeds, any vehicle with an open cargo bed or designed mainly for cargo. Pickups are always "truck".

Other: "motorcycle" for motorbikes; "boat" for boats/ships; "plane" for aircraft; "train" for trains/rail; "hot_wheels" for toy/die-cast models.

2. Identify the vehicle: brand, model, year.
3. If a license plate is visible (real vehicles only), extract ONLY the plate characters (uppercase, no spaces/dashes) in "plate", and "plate_bbox": {"x", "y", "width", "height"} in 0-1 coordinates. If not visible: "plate": null, "plate_bbox": null.

Respond with a single JSON object: {"vehicle_type": "car"|"truck"|"motorcycle"|"boat"|"plane"|"train"|"hot_wheels", "brand": "...", "model": "...", "year": "...", "confidence": 0.9, "plate": "XX123YY" or null, "plate_bbox": {...} or null}. No markdown.`,
      });

      const text = await callAI(API_KEY, [{ role: "user", content: contentParts }]);
      const validTypes = ["car", "truck", "motorcycle", "boat", "plane", "train", "hot_wheels"];
      let carResult = { brand: "Unknown", model: "Unknown", year: "2024", confidence: 0.3 };
      let plate: string | null = null;
      let plate_bbox: { x: number; y: number; width: number; height: number } | null = null;
      let vehicle_type = "car";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (parsed.brand) carResult = { brand: parsed.brand, model: parsed.model || "Unknown", year: String(parsed.year || "2024"), confidence: Number(parsed.confidence) || 0.5 };
        if (validTypes.includes(parsed.vehicle_type)) vehicle_type = parsed.vehicle_type;
        if (parsed.plate && /^[A-Z0-9]{2,12}$/i.test(String(parsed.plate).replace(/\s/g, ""))) {
          plate = String(parsed.plate).replace(/\s|-|\./g, "").toUpperCase().slice(0, 20);
        }
        const b = parsed.plate_bbox;
        if (b && typeof b.x === "number" && typeof b.y === "number" && typeof b.width === "number" && typeof b.height === "number") {
          const x = Math.max(0, Math.min(1, b.x));
          const y = Math.max(0, Math.min(1, b.y));
          const w = Math.max(0.02, Math.min(1, b.width));
          const h = Math.max(0.02, Math.min(1, b.height));
          plate_bbox = { x, y, width: w, height: h };
        }
      } catch { /* keep defaults */ }
      return jsonResponse({ ...carResult, license_plate: plate, plate_bbox, vehicle_type });
    }

    // —— action: editions ——
    if (body.action === "editions") {
      const { brand, model, year } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const wiki = await fetchWikipediaContent(brand, model);

      let prompt: string;
      if (wiki) {
        prompt = `Voici le contenu de l'article Wikipedia (${wiki.lang}) pour la ${brand} ${model} :

---
${wiki.text}
---

À partir de ce texte, extrais la liste des finitions, éditions spéciales, séries limitées et niveaux de finition (ex: "GT Line", "Sport", "Limited Edition", "M Package").
Réponds UNIQUEMENT avec un tableau JSON de strings. Pas de markdown, pas d'autre texte. Entre 5 et 25 entrées. Si tu ne trouves rien dans le texte, utilise tes connaissances pour compléter.`;
      } else {
        prompt = `You are a car expert. For the ${year} ${brand} ${model}, list the main trim levels, editions, and limited series (e.g. "GT Line", "Sport", "Limited Edition 500", "M Package").
Reply ONLY with a valid JSON array of strings, each string being one edition/trim name. No other text or markdown. Use 5 to 20 entries. If you don't know, return [].`;
      }

      const text = await callAI(API_KEY, [{ role: "user", content: prompt }]);
      let editions: string[] = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (Array.isArray(parsed)) {
          editions = parsed
            .filter((e: unknown) => typeof e === "string" && e.trim().length > 0)
            .map((e: unknown) => String(e).trim())
            .slice(0, 25);
        }
      } catch { /* keep [] */ }
      return jsonResponse({ editions });
    }

    // —— action: engines ——
    if (body.action === "engines") {
      const { brand, model, year, edition } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const wiki = await fetchWikipediaContent(brand, model);
      const editionHint = edition ? ` (trim/edition: ${edition})` : "";

      let prompt: string;
      if (wiki) {
        prompt = `Voici le contenu de l'article Wikipedia (${wiki.lang}) pour la ${brand} ${model} :

---
${wiki.text}
---

À partir de ce texte, extrais TOUTES les motorisations disponibles pour la ${year} ${brand} ${model}${editionHint}.
Réponds UNIQUEMENT avec un tableau JSON. Chaque objet : "name" (ex: "2.0 TFSI"), "displacement" (ex: "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (nombre). Inclus les versions GPL/LPG si mentionnées. Jusqu'à 15 moteurs. Si le texte ne contient pas assez d'infos, complète avec tes connaissances.`;
      } else {
        prompt = `You are a car expert. For the car: ${year} ${brand} ${model}${editionHint}.
Reply ONLY with a valid JSON array of engine options, no other text or markdown.
Each object: "name" (e.g. "2.0 TFSI", "3.0L I6"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (number). List ALL engine options including LPG/autogas and dual-fuel where applicable. Up to 15 engines. If unsure, return [].`;
      }

      const text = await callAI(API_KEY, [{ role: "user", content: prompt }]);
      return jsonResponse({ engines: parseEngines(text) });
    }

    // —— action: description ——
    if (body.action === "description") {
      const { brand, model, year, edition } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const wiki = await fetchWikipediaContent(brand, model);
      const editionHint = edition ? ` (version/édition: ${edition})` : "";

      let prompt: string;
      if (wiki) {
        prompt = `Voici le contenu de l'article Wikipedia (${wiki.lang}) pour la ${brand} ${model} :

---
${wiki.text}
---

À partir de ce texte, rédige une description encyclopédique courte de la ${year} ${brand} ${model}${editionHint} en français, dans le style Wikipedia : factuel, ton neutre, pas d'emojis, pas de puces.
Structure : un ou deux courts paragraphes couvrant l'origine du modèle, les caractéristiques techniques principales, le contexte de production et les faits notables. Maximum 1200 caractères. Pas de titres de section ni d'astérisques.`;
      } else {
        prompt = `Write a short encyclopedic description of the ${year} ${brand} ${model}${editionHint} in French, in the style of Wikipedia: factual, neutral tone, no emojis, no bullet symbols.
Structure: one or two short paragraphs covering origin of the model, main technical characteristics (engine, power, chassis), production context, and notable facts. Maximum 1200 characters. Do not use section titles or asterisks.`;
      }

      const description = await callAI(API_KEY, [
        { role: "system", content: "You are an expert automotive encyclopedia writer. Always respond with the requested content directly, no preamble." },
        { role: "user", content: prompt },
      ]);
      const final = description || `Aucune description pour la ${year} ${brand} ${model}.`;
      return jsonResponse({ description: final });
    }

    // —— action: car-info (combined description + engines) ——
    if (body.action === "car-info") {
      const { brand, model, year, edition, lang } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);
      const wantEn = lang === "en";

      const wiki = await fetchWikipediaContent(brand, model);
      const editionHint = edition ? (wantEn ? ` (version/edition: ${edition})` : ` (version/édition: ${edition})`) : "";

      let prompt: string;
      if (wiki) {
        if (wantEn) {
          prompt = `Here is the Wikipedia article content (${wiki.lang}) for the ${brand} ${model}:

---
${wiki.text}
---

From this text, provide TWO things for the ${year} ${brand} ${model}${editionHint} in a single JSON response:

1. "description": A short encyclopedic description in English (Wikipedia style, factual, neutral, no emojis, no bullet symbols, no section titles, no asterisks). Cover origin, technical characteristics, production context, notable facts. Max 1200 characters.

2. "engines": A JSON array of engine options. Each object: "name" (e.g. "2.0 TFSI"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (number). Include LPG/autogas if mentioned. Up to 15 engines. If the text lacks engine info, complete from your knowledge.

Reply ONLY with a valid JSON object: {"description": "...", "engines": [...]}. No markdown, no extra text.`;
        } else {
          prompt = `Voici le contenu de l'article Wikipedia (${wiki.lang}) pour la ${brand} ${model} :

---
${wiki.text}
---

À partir de ce texte, fournis DEUX choses pour la ${year} ${brand} ${model}${editionHint} dans une seule réponse JSON :

1. "description": Une description encyclopédique courte en français (style Wikipedia, factuel, neutre, pas d'emojis, pas de puces, pas de titres, pas d'astérisques). Couvre l'origine, les caractéristiques techniques, le contexte de production, les faits notables. Max 1200 caractères.

2. "engines": Un tableau JSON des motorisations. Chaque objet : "name" (ex: "2.0 TFSI"), "displacement" (ex: "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (nombre). Inclus GPL/LPG si mentionné. Jusqu'à 15 moteurs. Si le texte ne contient pas assez d'infos sur les moteurs, complète avec tes connaissances.

Réponds UNIQUEMENT avec un objet JSON valide : {"description": "...", "engines": [...]}. Pas de markdown, pas d'autre texte.`;
        }
      } else {
        if (wantEn) {
          prompt = `For the ${year} ${brand} ${model}${editionHint}, provide TWO things in a single JSON response:

1. "description": A short encyclopedic description in English (style Wikipedia, factual, neutral, no emojis, no bullet symbols, no section titles, no asterisks). Cover origin, technical characteristics, production context, notable facts. Max 1200 characters.

2. "engines": A JSON array of engine options. Each object has: "name" (e.g. "2.0 TFSI"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (number). Include LPG/autogas and dual-fuel where applicable. Up to 15 engines.

Reply ONLY with a valid JSON object: {"description": "...", "engines": [...]}. No markdown, no extra text.`;
        } else {
          prompt = `For the ${year} ${brand} ${model}${editionHint}, provide TWO things in a single JSON response:

1. "description": A short encyclopedic description in French (style Wikipedia, factual, neutral, no emojis, no bullet symbols, no section titles, no asterisks). Cover origin, technical characteristics, production context, notable facts. Max 1200 characters.

2. "engines": A JSON array of engine options. Each object has: "name" (e.g. "2.0 TFSI"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (number). Include LPG/autogas and dual-fuel where applicable. Up to 15 engines.

Reply ONLY with a valid JSON object: {"description": "...", "engines": [...]}. No markdown, no extra text.`;
        }
      }

      const text = await callAI(API_KEY, [
        { role: "system", content: "You are an expert automotive encyclopedia. Return only the requested JSON, no preamble." },
        { role: "user", content: prompt },
      ]);

      let description = wantEn
        ? `No description available for the ${year} ${brand} ${model}.`
        : `Aucune description pour la ${year} ${brand} ${model}.`;
      let engines: { name: string; displacement: string; fuel: string; hp: number }[] = [];

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (parsed.description && typeof parsed.description === "string") {
          description = parsed.description.trim();
        }
        if (Array.isArray(parsed.engines)) {
          engines = parseEngines(JSON.stringify(parsed.engines));
        }
      } catch {
        if (text.length > 20) description = text;
      }

      return jsonResponse({ description, engines });
    }

    // —— action: generation_bounds ——
    // Extract generations and year ranges for a make/model.
    if (body.action === "generation_bounds") {
      const { brand, model, lang } = body;
      if (!brand || !model) return errResponse("brand and model required.", 400);
      const wantEn = lang === "en";

      const wiki = await fetchWikipediaContent(brand, model);
      const prompt = wiki
        ? (wantEn
          ? `Here is the Wikipedia article content (${wiki.lang}) for the ${brand} ${model}:

---
${wiki.text}
---

From this text, extract the generations/series (e.g. "Mk7", "II", "W204", "Gen 3") and for each, a production year range (start_year, end_year).
Reply ONLY with a JSON array of objects: {"name": string, "start_year": number|null, "end_year": number|null}.
Rules:
- max 20 entries
- if a year is missing, use null
- if you find nothing, return []
No markdown, no extra text.`
          : `Voici le contenu de l'article Wikipedia (${wiki.lang}) pour la ${brand} ${model} :

---
${wiki.text}
---

À partir de ce texte, extrais la liste des générations/séries (ex: "Mk7", "II", "W204", "Gen 3") et pour chacune une borne d'années de production (start_year, end_year).
Réponds UNIQUEMENT avec un tableau JSON d'objets: {"name": string, "start_year": number|null, "end_year": number|null}.
Règles:
- max 20 entrées
- si une année manque, mets null
- si tu ne trouves rien, répond []
Pas de markdown, pas d'autre texte.`)
        : (wantEn
          ? `You are a vehicle expert. For ${brand} ${model}, list its main generations/series and approximate production year ranges.
Reply ONLY with a JSON array of objects: {"name": string, "start_year": number|null, "end_year": number|null}. Up to 20. If unknown return []. No other text.`
          : `Tu es un expert véhicules. Pour ${brand} ${model}, liste ses principales générations/séries et leurs bornes d'années de production approximatives.
Réponds UNIQUEMENT avec un tableau JSON d'objets: {"name": string, "start_year": number|null, "end_year": number|null}. Max 20. Si inconnu, []. Pas d'autre texte.`);

      const text = await callAI(API_KEY, [{ role: "user", content: prompt }]);
      let generations: { name: string; start_year: number | null; end_year: number | null }[] = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (Array.isArray(parsed)) {
          generations = parsed
            .map((g: any) => ({
              name: typeof g?.name === "string" ? g.name.trim() : "",
              start_year: typeof g?.start_year === "number" ? g.start_year : null,
              end_year: typeof g?.end_year === "number" ? g.end_year : null,
            }))
            .filter((g) => g.name.length > 0)
            .slice(0, 20);
        }
      } catch {
        generations = [];
      }

      return jsonResponse({ generations });
    }

    // —— action: get_price_and_units (estimated market price by condition + production units) ——
    if (body.action === "get_price_and_units") {
      const { brand, model, year, condition, edition, vehicle_type, lang } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);
      const cond = ["wreck", "bad", "good", "well_kept", "pristine"].includes(condition) ? condition : "good";
      const isMiniature = vehicle_type === "hot_wheels";
      const wantEn = lang === "en";
      const editionHint = edition ? (wantEn ? ` (edition: ${edition})` : ` (édition: ${edition})`) : "";

      const conditionContext = cond === "wreck" || cond === "bad"
        ? (wantEn ? "in poor or average condition (damaged, high mileage, needs work)" : "en mauvais ou moyen état (endommagé, kilométrage élevé, à retaper)")
        : cond === "good" || cond === "well_kept"
          ? (wantEn ? "in good condition (well maintained, normal wear)" : "en bon état (bien entretenu, usure normale)")
          : (wantEn ? "in perfect / pristine condition (excellent state, low mileage, collector grade)" : "en parfait état (excellent état, faible kilométrage, état collection)");

      let prompt: string;
      if (isMiniature) {
        prompt = wantEn
          ? `You are a collectible vehicles expert. For the ${year} ${brand} ${model}${editionHint} (die-cast / miniature, e.g. Hot Wheels, Matchbox):
1. Estimate the current market value in EUR for a specimen in ${cond} condition (box/blister state). Reply with "price_eur": number (integer, no decimals).
2. If you know the production run or number of units produced for this model/variant, reply with "units_produced": number. Otherwise use "units_produced": null.
Reply ONLY with a JSON object: {"price_eur": number, "units_produced": number|null, "price_display": "X XXX €", "condition_label": "..."}. No markdown. Use French condition_label only if lang is fr.`
          : `Tu es expert en miniatures et véhicules de collection. Pour la ${year} ${brand} ${model}${editionHint} (miniature type Hot Wheels, Majorette, etc.) :
1. Estime la valeur marchande actuelle en euros pour un exemplaire en état ${cond} (état blister/boîte). Réponds avec "price_eur" : nombre entier.
2. Si tu connais le tirage ou le nombre d'unités produites pour ce modèle/variant, réponds avec "units_produced" : nombre. Sinon "units_produced" : null.
Réponds UNIQUEMENT avec un objet JSON : {"price_eur": number, "units_produced": number|null, "price_display": "X XXX €", "condition_label": "..."}. Pas de markdown. condition_label en français.`;
      } else {
        prompt = wantEn
          ? `You are a used vehicle market expert. For the ${year} ${brand} ${model}${editionHint}:
1. Estimate the current market price in EUR for a vehicle ${conditionContext}. Today's date applies. Reply with "price_eur": number (integer).
2. If you know the total production volume (units produced) for this model/generation, reply with "units_produced": number. Otherwise "units_produced": null.
Reply ONLY with a JSON object: {"price_eur": number, "units_produced": number|null, "price_display": "X XXX €", "condition_label": "short label for the condition"}. No markdown. condition_label in English.`
          : `Tu es expert du marché de l'occasion. Pour la ${year} ${brand} ${model}${editionHint} :
1. Estime le prix de marché actuel en euros pour un véhicule ${conditionContext}. Date du jour à prendre en compte. Réponds avec "price_eur" : nombre entier.
2. Si tu connais le volume de production total (nombre d'unités produites) pour ce modèle/génération, réponds avec "units_produced" : nombre. Sinon "units_produced" : null.
Réponds UNIQUEMENT avec un objet JSON : {"price_eur": number, "units_produced": number|null, "price_display": "X XXX €", "condition_label": "libellé court de l'état"}. Pas de markdown. condition_label en français.`;
      }

      const text = await callAI(API_KEY, [
        { role: "system", content: "You are an expert. Return only the requested JSON, no preamble or markdown." },
        { role: "user", content: prompt },
      ]);

      let price_eur: number | null = null;
      let price_display = "";
      let units_produced: number | null = null;
      let condition_label = cond;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        if (typeof parsed.price_eur === "number" && parsed.price_eur >= 0) {
          price_eur = Math.round(parsed.price_eur);
          price_display = typeof parsed.price_display === "string" && parsed.price_display.trim()
            ? parsed.price_display.trim()
            : `${price_eur.toLocaleString("fr-FR")} €`;
        }
        if (typeof parsed.units_produced === "number" && parsed.units_produced >= 0) {
          units_produced = Math.round(parsed.units_produced);
        }
        if (typeof parsed.condition_label === "string" && parsed.condition_label.trim()) {
          condition_label = parsed.condition_label.trim();
        }
      } catch { /* keep nulls */ }
      return jsonResponse({ price_eur, price_display, units_produced, condition_label });
    }

    return errResponse("action required: 'identify', 'extract_plate', 'identify_and_extract_plate', 'engines', 'editions', 'description', 'car-info', 'generation_bounds' or 'get_price_and_units'.", 400);
  } catch (e) {
    console.error("car-api error:", e);
    return errResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
