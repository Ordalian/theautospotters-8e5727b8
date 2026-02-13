import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt = "";

    if (action === "engines") {
      prompt = `List the engine options available for the ${year} ${brand} ${model}. 
Include the engine name/designation, displacement, fuel type, and horsepower for each.
Respond ONLY with a JSON array, no markdown, no extra text. Example format:
[{"name":"2.0L Turbo I4","displacement":"2.0L","fuel":"Petrol","hp":255},{"name":"3.0L V6","displacement":"3.0L","fuel":"Petrol","hp":382}]
If you're unsure, give your best guess with common engines for that model. Return at most 8 options.`;
    } else if (action === "description") {
      prompt = `Write an enthusiast-friendly profile of the ${year} ${brand} ${model}. Include ALL of the following sections as plain text with clear headings using emoji:

🏎️ Overview: 2-3 sentences about what this car is, its generation/chassis code, and why enthusiasts care about it.

⚙️ Key Specs: Engine type, displacement, horsepower, torque, transmission, drivetrain, 0-60 time, and top speed (use best available data).

📊 Production: How many were built (total production numbers for this generation/year if known). If it's a limited edition, mention the exact number. If unknown, say "production figures not publicly available."

🏆 Notable Achievements: Any racing heritage, lap records, awards, or industry firsts.

💡 Fun Facts: 2-3 interesting or surprising facts about this car that most people don't know. These could be about its design, engineering quirks, celebrity owners, appearances in movies/games, nicknames, or unusual features.

💰 Market: Current approximate market value range if known.

Keep it concise but packed with real data. Respond with plain text only, no markdown formatting, no JSON.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    if (action === "engines") {
      let engines;
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        engines = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        engines = [];
      }
      return new Response(JSON.stringify({ engines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ description: text.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("car-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
