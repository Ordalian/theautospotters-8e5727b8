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

async function callAI(apiKey: string, messages: { role: string; content: string | object[] }[]): Promise<string> {
  const requestBody: Record<string, unknown> = {
    model: "openai/gpt-5-mini",
    messages,
    max_completion_tokens: 1024,
  };

  console.log("Calling AI gateway, model:", requestBody.model);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limit exceeded, please try again later.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway error (${response.status}): ${t}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content || "").trim();
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
Each object: "name" (e.g. "2.0 TFSI", "3.0L I6"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol"|"Diesel"|"Electric"|"Hybrid"), "hp" (number). List all engine options for this model/year (up to 15). If unsure, return [].`;
      const text = await callAI(API_KEY, [{ role: "user", content: prompt }]);
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
            .slice(0, 15);
        }
      } catch {
        // keep []
      }
      return jsonResponse({ engines });
    }

    // —— action: description ——
    if (body.action === "description") {
      const { brand, model, year, edition } = body;
      if (!brand || !model || year == null) return errResponse("brand, model and year required.", 400);

      const editionHint = edition ? ` (version/édition: ${edition})` : "";
      const prompt = `You are a car expert. Write a short encyclopedic description of the ${year} ${brand} ${model}${editionHint} in French, in the style of Wikipedia: factual, neutral tone, no emojis, no bullet symbols.
Structure: one or two short paragraphs covering origin of the model, main technical characteristics (engine, power, chassis), production context, and notable facts. Maximum 1200 characters. Do not use section titles or asterisks.`;
      const description = await callAI(API_KEY, [{ role: "user", content: prompt }]);
      const final = description || `Aucune description pour la ${year} ${brand} ${model}.`;
      return jsonResponse({ description: final });
    }

    return errResponse("action required: 'identify', 'engines', 'editions' or 'description'.", 400);
  } catch (e) {
    console.error("car-api error:", e);
    return errResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
