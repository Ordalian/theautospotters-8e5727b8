import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

async function callGemini(apiKey: string, parts: { text?: string; inline_data?: { mime_type: string; data: string } }[]): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini API error:", response.status, t);
    throw new Error(response.status === 403 ? "Clé GEMINI_API_KEY invalide ou quota dépassé." : "Erreur API Gemini.");
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!API_KEY) {
      return errResponse(
        "GEMINI_API_KEY manquant. Supabase → Edge Functions → Secrets : ajoute un secret nommé GEMINI_API_KEY (clé gratuite : aistudio.google.com/apikey).",
        500
      );
    }

    const body = await req.json();

    // —— action: identify (reconnaissance par image) ——
    if (body.action === "identify") {
      const images = body.images;
      if (!images?.length) return errResponse("Aucune image fournie.", 400);

      const parts: { inline_data?: { mime_type: string; data: string }; text?: string }[] = [];
      for (const img of images) {
        const m = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
      }
      parts.push({
        text: `You are an expert car identifier. Analyze the provided image(s) of a car and identify:
1. The brand/manufacturer
2. The exact model name
3. The approximate year or year range

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"brand": "Brand Name", "model": "Model Name", "year": "2024", "confidence": 0.85}

The confidence should be a number between 0 and 1. If you cannot identify the car, use your best guess.`,
      });

      const text = await callGemini(API_KEY, parts);
      let parsed: { brand: string; model: string; year: string; confidence: number };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = { brand: "Unknown", model: "Unknown", year: "2024", confidence: 0.3 };
      }
      return jsonResponse(parsed);
    }

    // —— action: engines ——
    if (body.action === "engines") {
      const { brand, model, year } = body;
      if (!brand || !model || year == null) return errResponse("brand, model et year requis.", 400);

      const prompt = `You are a car expert. For the car: ${year} ${brand} ${model}.
Reply ONLY with a valid JSON array of engine options, no other text or markdown.
Each object: "name" (e.g. "2.0L I4"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"), "hp" (number). Max 8 engines. If unsure, return [].`;
      const text = await callGemini(API_KEY, [{ text: prompt }]);
      let engines: { name: string; displacement: string; fuel: string; hp: number }[] = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (Array.isArray(parsed)) {
          engines = parsed
            .filter((e: any) => e && typeof e.name === "string" && typeof e.hp === "number" && e.hp >= 30 && e.hp <= 2000)
            .map((e: any) => ({
              name: String(e.name || ""),
              displacement: String(e.displacement ?? e.name ?? ""),
              fuel: String(e.fuel || "Petrol"),
              hp: Number(e.hp),
            }))
            .slice(0, 8);
        }
      } catch {
        // keep []
      }
      return jsonResponse({ engines });
    }

    // —— action: description ——
    if (body.action === "description") {
      const { brand, model, year } = body;
      if (!brand || !model || year == null) return errResponse("brand, model et year requis.", 400);

      const prompt = `You are a car expert. Write a short description of the ${year} ${brand} ${model} in French.
Include: brief overview, key specs (engine, power if known), and one fun fact. Friendly tone. Under 600 characters. No bullet points.`;
      const description = await callGemini(API_KEY, [{ text: prompt }]);
      const final = description || `Aucune description pour la ${year} ${brand} ${model}.`;
      return jsonResponse({ description: final });
    }

    return errResponse("action requis: 'identify', 'engines' ou 'description'.", 400);
  } catch (e) {
    console.error("car-api error:", e);
    return errResponse(e instanceof Error ? e.message : "Erreur inconnue", 500);
  }
});
