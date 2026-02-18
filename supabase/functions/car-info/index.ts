import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function searchWikipedia(query: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AutoSpotters/1.0 (https://github.com/theautospotters; contact@example.com)',
      },
    });
    if (!res.ok) {
      console.error(`Wikipedia search failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const results = data?.query?.search;
    if (!results || results.length === 0) return null;
    return results[0].title;
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return null;
  }
}

async function getWikipediaContent(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(title)}&format=json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AutoSpotters/1.0 (https://github.com/theautospotters; contact@example.com)',
      },
    });
    if (!res.ok) {
      console.error(`Wikipedia content fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    if (page?.missing) {
      console.error(`Wikipedia page missing: ${title}`);
      return null;
    }
    return page?.extract || null;
  } catch (error) {
    console.error('Wikipedia content fetch error:', error);
    return null;
  }
}

function parseEngines(content: string): { name: string; displacement: string; fuel: string; hp: number }[] {
  const engines: { name: string; displacement: string; fuel: string; hp: number }[] = [];
  const seen = new Set<string>();

  const lines = content.split("\n");
  for (const line of lines) {
    // Look for lines with displacement info like "2.0 L" and power like "200 hp"
    const dispMatch = line.match(/(\d+\.?\d*)\s*[Ll]\b/);
    const powerMatch = line.match(/(\d{2,4})\s*(hp|bhp|PS|kW)\b/i);

    if (!dispMatch || !powerMatch) continue;

    const displacement = dispMatch[1] + "L";
    let hp = parseInt(powerMatch[1]);

    // Convert kW to hp if needed
    if (powerMatch[2].toLowerCase() === "kw") {
      hp = Math.round(hp * 1.341);
    }

    if (hp < 30 || hp > 2000) continue;

    // Detect engine type
    let engineType = "engine";
    if (/V8/i.test(line)) engineType = "V8";
    else if (/V6/i.test(line)) engineType = "V6";
    else if (/V12/i.test(line)) engineType = "V12";
    else if (/V10/i.test(line)) engineType = "V10";
    else if (/I4|inline.?4|four.?cylinder/i.test(line)) engineType = "I4";
    else if (/I6|inline.?6|six.?cylinder/i.test(line)) engineType = "I6";
    else if (/flat.?6|boxer.?6/i.test(line)) engineType = "Flat-6";
    else if (/flat.?4|boxer.?4/i.test(line)) engineType = "Flat-4";
    else if (/W12/i.test(line)) engineType = "W12";

    // Detect fuel
    let fuel = "Petrol";
    if (/diesel|TDI|CDI|HDI/i.test(line)) fuel = "Diesel";
    else if (/electric|EV/i.test(line)) fuel = "Electric";
    else if (/hybrid/i.test(line)) fuel = "Hybrid";

    const name = `${displacement} ${engineType}`;
    const key = `${name}-${hp}`;

    if (!seen.has(key)) {
      seen.add(key);
      engines.push({ name, displacement, fuel, hp });
    }

    if (engines.length >= 8) break;
  }

  return engines;
}

function formatDescription(content: string, brand: string, model: string, year: number): string {
  if (!content) return `No information found for the ${year} ${brand} ${model}.`;

  // Clean up Wikipedia markup
  const text = content
    .replace(/\[\d+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 40);
  if (paragraphs.length === 0) return text.substring(0, 800);

  const sections: string[] = [];

  // Overview
  if (paragraphs[0]) {
    sections.push("🏎️ Overview\n" + paragraphs[0].trim().substring(0, 500));
  }

  // Find a specs paragraph
  const specsPara = paragraphs.find((p) =>
    /engine|power|hp|torque|speed|0.60|acceleration|displacement/i.test(p)
  );
  if (specsPara) {
    sections.push("⚙️ Key Specs\n" + specsPara.trim().substring(0, 500));
  }

  // Find production info
  const prodPara = paragraphs.find((p) =>
    /production|built|manufactured|units/i.test(p)
  );
  if (prodPara) {
    sections.push("📊 Production\n" + prodPara.trim().substring(0, 300));
  }

  // Find racing/achievement info
  const racePara = paragraphs.find((p) =>
    /racing|championship|record|award|Le Mans|Nurburgring/i.test(p)
  );
  if (racePara) {
    sections.push("🏆 Notable Achievements\n" + racePara.trim().substring(0, 300));
  }

  // Fun fact
  const funPara = paragraphs.find((p) =>
    /nickname|famous|iconic|unique|first|only|special/i.test(p)
  );
  if (funPara && funPara !== specsPara && funPara !== prodPara) {
    sections.push("💡 Fun Facts\n" + funPara.trim().substring(0, 300));
  }

  return sections.length > 0 ? sections.join("\n\n") : text.substring(0, 800);
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

    // Try multiple search queries to find the right Wikipedia article
    const wikiTitle =
      await searchWikipedia(`${brand} ${model} ${year} car`) ||
      await searchWikipedia(`${brand} ${model} automobile`) ||
      await searchWikipedia(`${brand} ${model}`);

    if (!wikiTitle) {
      if (action === "engines") {
        return new Response(JSON.stringify({ engines: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ description: `No Wikipedia article found for the ${year} ${brand} ${model}.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = await getWikipediaContent(wikiTitle);

    if (!content) {
      if (action === "engines") {
        return new Response(JSON.stringify({ engines: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ description: `Could not load Wikipedia content for the ${year} ${brand} ${model}.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "engines") {
      const engines = parseEngines(content);
      return new Response(JSON.stringify({ engines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "description") {
      const description = formatDescription(content, brand, model, year);
      return new Response(JSON.stringify({ description }), {
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
