/**
 * Récupère les infos voiture (moteurs, description) depuis Wikipedia.
 * Aucune clé API requise — tout côté client.
 */

const WIKI_ORIGIN = "https://en.wikipedia.org";

async function wikiFetch(path: string): Promise<Response> {
  return fetch(`${WIKI_ORIGIN}${path}`, {
    headers: {
      "User-Agent": "AutoSpotters/1.0 (https://github.com/theautospotters)",
    },
  });
}

export async function searchWikipedia(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    format: "json",
    srlimit: "1",
    origin: "*",
  });
  const res = await wikiFetch(`/w/api.php?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const results = data?.query?.search;
  if (!results?.length) return null;
  return results[0].title;
}

export async function getWikipediaContent(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    titles: title,
    format: "json",
    origin: "*",
  });
  const res = await wikiFetch(`/w/api.php?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as { extract?: string; missing?: boolean };
  if (page?.missing) return null;
  return page?.extract ?? null;
}

export type EngineOption = { name: string; displacement: string; fuel: string; hp: number };

function parseEngines(content: string): EngineOption[] {
  const engines: EngineOption[] = [];
  const seen = new Set<string>();
  const lines = content.split("\n");
  for (const line of lines) {
    const dispMatch = line.match(/(\d+\.?\d*)\s*[Ll]\b/);
    const powerMatch = line.match(/(\d{2,4})\s*(hp|bhp|PS|kW)\b/i);
    if (!dispMatch || !powerMatch) continue;
    const displacement = dispMatch[1] + "L";
    let hp = parseInt(powerMatch[1], 10);
    if (powerMatch[2].toLowerCase() === "kw") hp = Math.round(hp * 1.341);
    if (hp < 30 || hp > 2000) continue;
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

function formatDescription(
  content: string,
  brand: string,
  model: string,
  year: number
): string {
  if (!content) return `Aucune information trouvée pour la ${year} ${brand} ${model}.`;
  const text = content
    .replace(/\[\d+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 40);
  if (paragraphs.length === 0) return text.substring(0, 800);
  const sections: string[] = [];
  if (paragraphs[0])
    sections.push("🏎️ Aperçu\n" + paragraphs[0].trim().substring(0, 500));
  const specsPara = paragraphs.find((p) =>
    /engine|power|hp|torque|speed|0.60|acceleration|displacement/i.test(p)
  );
  if (specsPara)
    sections.push("⚙️ Caractéristiques\n" + specsPara.trim().substring(0, 500));
  const prodPara = paragraphs.find((p) =>
    /production|built|manufactured|units/i.test(p)
  );
  if (prodPara)
    sections.push("📊 Production\n" + prodPara.trim().substring(0, 300));
  const racePara = paragraphs.find((p) =>
    /racing|championship|record|award|Le Mans|Nurburgring/i.test(p)
  );
  if (racePara)
    sections.push("🏆 Palmarès\n" + racePara.trim().substring(0, 300));
  const funPara = paragraphs.find((p) =>
    /nickname|famous|iconic|unique|first|only|special/i.test(p)
  );
  if (funPara && funPara !== specsPara && funPara !== prodPara)
    sections.push("💡 Le saviez-vous\n" + funPara.trim().substring(0, 300));
  return sections.length > 0 ? sections.join("\n\n") : text.substring(0, 800);
}

/** Récupère la liste des moteurs pour une voiture (Wikipedia). */
export async function fetchEngines(
  brand: string,
  model: string,
  year: number
): Promise<EngineOption[]> {
  const title =
    (await searchWikipedia(`${brand} ${model} ${year} car`)) ||
    (await searchWikipedia(`${brand} ${model} automobile`)) ||
    (await searchWikipedia(`${brand} ${model}`));
  if (!title) return [];
  const content = await getWikipediaContent(title);
  if (!content) return [];
  return parseEngines(content);
}

/** Récupère la description pour une voiture (Wikipedia). */
export async function fetchDescription(
  brand: string,
  model: string,
  year: number
): Promise<string> {
  const title =
    (await searchWikipedia(`${brand} ${model} ${year} car`)) ||
    (await searchWikipedia(`${brand} ${model} automobile`)) ||
    (await searchWikipedia(`${brand} ${model}`));
  if (!title)
    return `Aucun article Wikipedia trouvé pour la ${year} ${brand} ${model}.`;
  const content = await getWikipediaContent(title);
  if (!content)
    return `Impossible de charger le contenu pour la ${year} ${brand} ${model}.`;
  return formatDescription(content, brand, model, year);
}
