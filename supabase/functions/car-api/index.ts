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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
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
        text: `You are an expert car identifier. Analyze the provided image(s) of a car and identify:
1. The brand/manufacturer
2. The exact model name
3. The approximate year or year range

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"brand": "Brand Name", "model": "Model Name", "year": "2024", "confidence": 0.85}

The confidence should be a number between 0 and 1. If you cannot identify the car, use your best guess.`,
      });

      const text = await callAI(API_KEY, [{ role: "user", content: contentParts }]);
      let parsed: { brand: string; model: string; year: string; confidence: number };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = { brand: "Unknown", model: "Unknown", year: "2024", confidence: 0.3 };
      }
      return jsonResponse(parsed);
    }

    // —— action: editions —— (trims / limited series for brand+model+year)
    if (body.action === "editions") {
      const { brand, model, year } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const prompt = `You are a car expert. For the ${year} ${brand} ${model}, list the main trim levels, editions, and limited series (e.g. "GT Line", "Sport", "Limited Edition 500", "M Package").
Reply ONLY with a valid JSON array of strings, each string being one edition/trim name. No other text or markdown. Use 5 to 20 entries. If you don't know, return [].`;
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
      } catch {
        // keep []
      }
      return jsonResponse({ editions });
    }

    // —— action: engines ——
    if (body.action === "engines") {
      const { brand, model, year, edition } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const editionHint = edition ? ` (trim/edition: ${edition})` : "";
      const prompt = `You are a car expert. For the car: ${year} ${brand} ${model}${editionHint}.
Reply ONLY with a valid JSON array of engine options, no other text or markdown.
Each object: "name" (e.g. "2.0 TFSI", "3.0L I6"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (number). List ALL engine options including LPG/autogas and dual-fuel where applicable (e.g. Renault LPG, many European models). Up to 15 engines. If unsure, return [].`;
      const text = await callAI(API_KEY, [{ role: "user", content: prompt }]);
      return jsonResponse({ engines: parseEngines(text) });
    }

    // —— action: description ——
    if (body.action === "description") {
      const { brand, model, year, edition } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const editionHint = edition ? ` (version/édition: ${edition})` : "";
      const prompt = `Write a short encyclopedic description of the ${year} ${brand} ${model}${editionHint} in French, in the style of Wikipedia: factual, neutral tone, no emojis, no bullet symbols.
Structure: one or two short paragraphs covering origin of the model, main technical characteristics (engine, power, chassis), production context, and notable facts. Maximum 1200 characters. Do not use section titles or asterisks.`;
      const description = await callAI(API_KEY, [
        { role: "system", content: "You are an expert automotive encyclopedia writer. Always respond with the requested content directly, no preamble." },
        { role: "user", content: prompt },
      ]);
      const final = description || `Aucune description pour la ${year} ${brand} ${model}.`;
      return jsonResponse({ description: final });
    }

    // —— action: car-info (combined description + engines in one call) ——
    if (body.action === "car-info") {
      const { brand, model, year, edition } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const editionHint = edition ? ` (version/édition: ${edition})` : "";
      const prompt = `For the ${year} ${brand} ${model}${editionHint}, provide TWO things in a single JSON response:

1. "description": A short encyclopedic description in French (style Wikipedia, factual, neutral, no emojis, no bullet symbols, no section titles, no asterisks). Cover origin, technical characteristics, production context, notable facts. Max 1200 characters.

2. "engines": A JSON array of engine options. Each object has: "name" (e.g. "2.0 TFSI"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"|"LPG"), "hp" (number). Include LPG/autogas and dual-fuel where applicable (e.g. Renault). Up to 15 engines.

Reply ONLY with a valid JSON object: {"description": "...", "engines": [...]}. No markdown, no extra text.`;

      const text = await callAI(API_KEY, [
        { role: "system", content: "You are an expert automotive encyclopedia. Return only the requested JSON, no preamble." },
        { role: "user", content: prompt },
      ]);

      let description = `Aucune description pour la ${year} ${brand} ${model}.`;
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
        // fallback: try to extract description from raw text
        if (text.length > 20) description = text;
      }

      return jsonResponse({ description, engines });
    }

    return errResponse("action required: 'identify', 'engines', 'editions' or 'description'.", 400);
  } catch (e) {
    console.error("car-api error:", e);
    return errResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
