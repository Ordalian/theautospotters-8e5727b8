import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images } = await req.json();
    const API_KEY = Deno.env.get("IDENTIFY_CAR_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({
          error: "IDENTIFY_CAR_API_KEY is not configured. Add it in Supabase: Edge Functions → Secrets (name: IDENTIFY_CAR_API_KEY).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!images?.length) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parts: any[] = [];
    for (const img of images) {
      const matches = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inline_data: {
            mime_type: matches[1],
            data: matches[2],
          },
        });
      }
    }

    parts.push({
      text: `You are an expert car identifier. Analyze the provided image(s) of a car and identify:
1. The brand/manufacturer
2. The exact model name
3. The approximate year or year range

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"brand": "Brand Name", "model": "Model Name", "year": "2024", "confidence": 0.85}

The confidence should be a number between 0 and 1 representing how confident you are in the identification.
If you cannot identify the car, use your best guess and set confidence accordingly.`,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    const responseText = await response.text();
    if (!response.ok) {
      console.error("Gemini API error:", response.status, responseText);
      let message = "Gemini API error";
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.error?.message) message = errJson.error.message;
        else if (response.status === 403) message = "Clé API Gemini invalide ou quota dépassé. Vérifiez GEMINI_API_KEY sur https://aistudio.google.com/apikey";
        else if (response.status === 429) message = "Quota Gemini dépassé. Réessayez plus tard.";
      } catch {
        if (response.status === 403) message = "Clé API Gemini invalide. Vérifiez GEMINI_API_KEY dans les secrets Supabase.";
        if (response.status === 429) message = "Quota dépassé. Réessayez plus tard.";
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      parsed = { brand: "Unknown", model: "Unknown", year: "2024", confidence: 0.3 };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-car error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
