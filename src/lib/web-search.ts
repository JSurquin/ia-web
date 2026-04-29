// ============================================================
// web-search.ts — Recherche web via DuckDuckGo (scraping HTML)
//
// Effectue une recherche sur DuckDuckGo, parse le HTML de la
// page de resultats, et retourne les textes exploitables.
//
// Aucune cle API requise, 100% gratuit.
// DuckDuckGo est prefere a Google car il ne bloque pas
// les requetes serveur avec des CAPTCHAs.
//
// Usage interne : appele par askRAG() quand webSearch = true
// ============================================================

export interface WebResult {
  title: string;
  snippet: string;
  url: string;
}

// ============================================================
// searchWeb — Scrape DuckDuckGo HTML et retourne les resultats
//
// 1. Fetch la page HTML de DuckDuckGo avec la query
// 2. Parse les blocs de resultats via regex
// 3. Retourne un tableau de { title, snippet, url }
//
// On utilise le endpoint html.duckduckgo.com qui retourne
// du HTML simple (pas de JS), parfait pour le scraping serveur.
// ============================================================
export async function searchWeb(query: string, maxResults = 5): Promise<WebResult[]> {
  const encoded = encodeURIComponent(query);
  const url = "https://html.duckduckgo.com/html/?q=" + encoded;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    console.error("DuckDuckGo fetch failed:", res.status);
    return [];
  }

  const html = await res.text();
  return parseResults(html, maxResults);
}

// Parse le HTML de DuckDuckGo pour extraire les resultats
function parseResults(html: string, max: number): WebResult[] {
  const results: WebResult[] = [];

  // Chaque resultat est dans un bloc <div class="result ...">
  // Le titre est dans <a class="result__a">
  // Le snippet est dans <a class="result__snippet">
  const blocks = html.split("result__body");

  for (let i = 1; i < blocks.length && results.length < max; i++) {
    const block = blocks[i];

    const title = extractText(block, 'result__a"', "</a>");
    const snippet = extractText(block, 'result__snippet"', "</a>");
    const url = extractHref(block, 'result__url"');

    if (snippet) {
      results.push({
        title: cleanHtml(title || "Sans titre"),
        snippet: cleanHtml(snippet),
        url: cleanUrl(url || ""),
      });
    }
  }

  return results;
}

// Extrait le texte entre une classe CSS et un tag fermant
function extractText(html: string, startMarker: string, endTag: string): string | null {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;

  const afterMarker = html.indexOf(">", startIdx + startMarker.length);
  if (afterMarker === -1) return null;

  const endIdx = html.indexOf(endTag, afterMarker);
  if (endIdx === -1) return null;

  return html.slice(afterMarker + 1, endIdx);
}

// Extrait le href d'un lien apres un marqueur
function extractHref(html: string, marker: string): string | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  const hrefIdx = html.lastIndexOf('href="', idx);
  if (hrefIdx === -1) return null;

  const start = hrefIdx + 6;
  const end = html.indexOf('"', start);
  if (end === -1) return null;

  return html.slice(start, end);
}

// Nettoie le HTML (tags, entites, espaces)
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")       // Supprime les tags HTML
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")          // Normalise les espaces
    .trim();
}

// Nettoie les URLs trackees de DuckDuckGo
function cleanUrl(url: string): string {
  if (url.includes("uddg=")) {
    try {
      const decoded = decodeURIComponent(url.split("uddg=")[1].split("&")[0]);
      return decoded;
    } catch {
      return url;
    }
  }
  return url;
}

// ============================================================
// formatWebResultsAsContext — Formate les resultats web en texte
//
// Transforme les resultats web en un bloc de texte lisible
// que le LLM peut utiliser comme contexte supplementaire.
// ============================================================
export function formatWebResultsAsContext(results: WebResult[]): string {
  if (results.length === 0) return "";

  return results
    .map((r, i) => "[Web " + (i + 1) + "] " + r.title + "\n" + r.snippet + "\nSource: " + r.url)
    .join("\n\n");
}
