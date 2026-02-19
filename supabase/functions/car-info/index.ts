import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
    throw new Error(response.status === 403 ? "CAR_INFO_API_KEY invalide." : "Erreur API Gemini.");
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = Deno.env.get("CAR_INFO_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({
          error: "CAR_INFO_API_KEY is not configured. Add it in Supabase: Edge Functions → Secrets (name: CAR_INFO_API_KEY).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, brand, model, year } = await req.json();
    if (!action || !brand || !model || year == null) {
      return new Response(
        JSON.stringify({ error: "Missing action, brand, model or year" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "engines") {
      const prompt = `You are a car expert. For the car: ${year} ${brand} ${model}.
Reply ONLY with a valid JSON array of engine options, no other text or markdown.
Each object must have: "name" (e.g. "2.0L I4"), "displacement" (e.g. "2.0L"), "fuel" ("Petrol" or "Diesel" or "Electric" or "Hybrid"), "hp" (number).
Maximum 8 engines. If unsure, return [].`;
      const text = await callGemini(API_KEY, prompt);
      let engines: { name: string; displacement: string; fuel: string; hp: number }[] = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (Array.isArray(parsed)) {
          engines = parsed
            .filter(
              (e: any) =>
                e && typeof e.name === "string" && typeof e.hp === "number" && e.hp >= 30 && e.hp <= 2000
            )
            .map((e: any) => ({
              name: String(e.name || ""),
              displacement: String(e.displacement ?? e.name ?? ""),
              fuel: String(e.fuel || "Petrol"),
              hp: Number(e.hp),
            }))
            .slice(0, 8);
        }
      } catch {
        // keep engines []
      }
      return new Response(JSON.stringify({ engines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "description") {
      const prompt = `You are a car expert. Write a short description of the ${year} ${brand} ${model} in French.
Include: brief overview, key specs (engine, power if known), and one fun fact. Friendly tone. Under 600 characters. No bullet points.`;
      const description = await callGemini(API_KEY, prompt);
      const final = description || `Aucune description pour la ${year} ${brand} ${model}.`;
      return new Response(JSON.stringify({ description: final }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'engines' or 'description'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("car-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
