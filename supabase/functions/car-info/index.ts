import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits.");
    }
    const t = await response.text();
    console.error("Lovable AI error:", response.status, t);
    throw new Error("AI request failed");
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content || "").trim();
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

    const { action, brand, model, year } = await req.json();

    if (action === "engines") {
      const systemPrompt = `You are a car expert. Reply ONLY with a valid JSON array, no other text or markdown.
Each item must have: name (e.g. "2.0L I4"), displacement (e.g. "2.0L"), fuel ("Petrol", "Diesel", "Electric", or "Hybrid"), hp (number).
List the main engine options for the given car. Maximum 8 engines. If unsure, return an empty array [].`;
      const userPrompt = `List engine options for: ${year} ${brand} ${model}. Reply with JSON array only.`;

      const text = await callLovableAI(systemPrompt, userPrompt);
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
              displacement: String(e.displacement || e.name || ""),
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
      const systemPrompt = `You are a car expert. Write a short, engaging description of the car in plain text.
Include: brief overview, key specs (engine, power, performance if known), and one fun fact or notable detail.
Write in a friendly tone. Keep total length under 600 characters. No bullet points, use short paragraphs.`;
      const userPrompt = `Describe the ${year} ${brand} ${model} in a few short paragraphs (overview, key specs, one fun fact).`;

      const description = await callLovableAI(systemPrompt, userPrompt);
      const finalDescription =
        description || `No description available for the ${year} ${brand} ${model}.`;
      return new Response(JSON.stringify({ description: finalDescription }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
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
