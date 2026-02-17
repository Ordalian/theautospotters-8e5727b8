import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Search Wikipedia for a car article
async function searchWikipedia(query: string): Promise<string | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`;
  const res = await fetch(searchUrl);
  const data = await res.json();
  const results = data?.query?.search;
  if (!results || results.length === 0) return null;
  return results[0].title;
}

// Get Wikipedia page content (intro section)
async function getWikipediaContent(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(title)}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as any;
  return page?.extract || null;
}

// Parse engines from Wikipedia content
function parseEngines(content: string, brand: string, model: string): { name: string; displacement: string; fuel: string; hp: number }[] {
  const engines: { name: string; displacement: string; fuel: string; hp: number }[] = [];
  
  // Common engine patterns in Wikipedia
  const enginePatterns = [
    // Pattern: "2.0 L (122 cu in) I4 turbocharged, 250 hp"
    /(\d+\.?\d*)\s*[Ll]\s*(?:\(\d+\s*cu\s*in\))?\s*(I4|I6|V6|V8|V10|V12|W12|flat-?[46]|boxer|inline-?[46]|straight-?[46]|four-cylinder|six-cylinder|eight-cylinder|electric|hybrid)\s*(?:turbocharged|turbo|naturally\s*aspirated|supercharged)?\s*[,;]?\s*(\d+)\s*(?:hp|PS|kW|bhp)/gi,
    // Pattern: "250 hp (186 kW) 2.0 L I4"
    /(\d+)\s*(?:hp|bhp|PS)\s*(?:\(\d+\s*kW\))?\s*(\d+\.?\d*)\s*[Ll]\s*(I4|I6|V6|V8|V10|V12|W12|flat-?[46]|inline-?[46])/gi,
  ];

  // Extract engine section from Wikipedia
  const engineSection = content.match(/(?:engine|powertrain|specifications?|variants?)[^\n]*\n([\s\S]{0,3000}?)(?=\n#{1,3}\s|\n\n\n|$)/i);
  const textToSearch = engineSection ? engineSection[0] : content.substring(0, 5000);

  // Find displacement + power combinations
  const displacementMatches = textToSearch.matchAll(/(\d+\.?\d*)\s*[Ll]\s*(?:turbocharged|turbo|naturally\s*aspirated|supercharged|DOHC|SOHC|VTEC|VVT)?\s*(I4|I6|V6|V8|V10|V12|W12|flat[- ]?[46]|inline[- ]?[46]|four|six|eight|twelve)?[^.]{0,100}?(\d{2,4})\s*(?:hp|bhp|PS|kW)/gi;
  
  for (const match of Array.from(displacementMatches).slice(0, 8)) {
    const displacement = `${match[1]}L`;
    const cylinderType = match[2] || "engine";
    const power = parseInt(match[3]);
    
    if (power < 30 || power > 2000) continue; // sanity check

    // Determine fuel type
    const contextAround = match[0].toLowerCase();
    let fuel = "Petrol";
    if (contextAround.includes("diesel") || contextAround.includes("tdi") || contextAround.includes("cdi")) fuel = "Diesel";
    else if (contextAround.includes("electric") || contextAround.includes("ev")) fuel = "Electric";
    else if (contextAround.includes("hybrid")) fuel = "Hybrid";

    const name = `${displacement} ${cylinderType.toUpperCase()}`;
    
    // Avoid duplicates
    if (!engines.find(e => e.name === name && e.hp === power)) {
      engines.push({ name, displacement, fuel, hp: power });
    }
  }

  // If no engines found via regex, extract known engine names from text
  if (engines.length === 0) {
    const knownEngines = [
      { pattern: /2\.0[Ll]?\s*(?:turbo|TSI|TFSI|TDI|CDI|GTI)/i, name: "2.0L Turbo", displacement: "2.0L", fuel: "Petrol", hp: 200 },
      { pattern: /3\.0[Ll]?\s*(?:V6|biturbo)/i, name: "3.0L V6", displacement: "3.0L", fuel: "Petrol", hp: 300 },
      { pattern: /4\.0[Ll]?\s*(?:V8|biturbo)/i, name: "4.0L V8", displacement: "4.0L", fuel: "Petrol", hp: 450 },
      { pattern: /5\.0[Ll]?\s*(?:V8)/i, name: "5.0L V8", displacement: "5.0L", fuel: "Petrol", hp: 450 },
    ];
    
    for (const known of knownEngines) {
      if (known.pattern.test(textToSearch)) {
        engines.push({ name: known.name, displacement: known.displacement, fuel: known.fuel, hp: known.hp });
      }
    }
  }

  return engines.slice(0, 8);
}

// Format Wikipedia content as a car description
function formatDescription(content: string, brand: string, model: string, year: number): string {
  if (!content) return "";
  
  // Clean up Wikipedia markup
  let text = content
    .replace(/={2,}/g, "") // Remove section headers markers
    .replace(/\[\d+\]/g, "") // Remove citation markers like [1]
    .replace(/\{\{[^}]*\}\}/g, "") // Remove template markers
    .replace(/\n{3,}/g, "\n\n") // Normalize whitespace
    .trim();

  // Extract the most relevant sections
  const sections: string[] = [];

  // Overview (first paragraph)
  const paragraphs = text.split("\n\n").filter(p => p.trim().length > 50);
  if (paragraphs.length > 0) {
    sections.push(`🏎️ Overview\n${paragraphs[0].trim()}`);
  }

  // Look for specs section
  const specsMatch = text.match(/(?:Specifications?|Technical\s+data|Performance)[^\n]*\n([\s\S]{0,1000}?)(?=\n[A-Z]|\n\n\n|$)/i);
  if (specsMatch) {
    sections.push(`⚙️ Key Specs\n${specsMatch[1].trim().substring(0, 500)}`);
  } else if (paragraphs.length > 1) {
    // Use second paragraph as specs if no dedicated section
    const specPara = paragraphs.find(p => 
      /engine|power|hp|torque|speed|0-60|acceleration/i.test(p)
    );
    if (specPara) sections.push(`⚙️ Key Specs\n${specPara.trim().substring(0, 500)}`);
  }

  // Look for production info
  const productionMatch = text.match(/(?:production|built|manufactured|units?)[^\n.]*(\d[\d,]+)[^\n.]*/i);
  if (productionMatch) {
    sections.push(`📊 Production\n${productionMatch[0].trim()}`);
  }

  // Look for racing/achievements
  const racingMatch = text.match(/(?:racing|motorsport|competition|championship|Le\s*Mans|Nürburgring|record)[^\n]*\n?[^\n]*/i);
  if (racingMatch) {
    sections.push(`🏆 Notable Achievements\n${racingMatch[0].trim()}`);
  }

  // Add a fun fact from remaining paragraphs
  if (paragraphs.length > 2) {
    const funPara = paragraphs.find(p => 
      /nickname|known as|famous|unique|first|only|special|iconic/i.test(p)
    );
    if (funPara) {
      sections.push(`💡 Fun Facts\n${funPara.trim().substring(0, 300)}`);
    }
  }

  if (sections.length === 0) {
    // Fallback: return first 800 chars of clean text
    return text.substring(0, 800);
  }

  return sections.join("\n\n");
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

    // Search Wikipedia for this car
    const searchQuery = `${year} ${brand} ${model} automobile`;
    const wikiTitle = await searchWikipedia(searchQuery) 
      || await searchWikipedia(`${brand} ${model}`)
      || await searchWikipedia(`${brand} ${model} car`);

    if (!wikiTitle) {
      if (action === "engines") {
        return new Response(JSON.stringify({ engines: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ description: `No information found for the ${year} ${brand} ${model} on Wikipedia.` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const content = await getWikipediaContent(wikiTitle);

    if (!content) {
      if (action === "engines") {
        return new Response(JSON.stringify({ engines: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ description: `Could not retrieve information for the ${year} ${brand} ${model}.` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "engines") {
      const engines = parseEngines(content, brand, model);
      return new Response(JSON.stringify({ engines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "description") {
      const description = formatDescription(content, brand, model, year);
      return new Response(JSON.stringify({ description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (e) {
    console.error("car-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
