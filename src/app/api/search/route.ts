// ============================================================
// POST /api/search — Recherche semantique seule (sans LLM)
//
// Transforme la requete en vecteur et cherche les 5 documents
// les plus proches dans pgvector. Pas d'appel au LLM ici.
// Utile pour debugger ou voir quels documents remontent.
//
// Necessite d'etre authentifie (cookie JWT).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchDocuments } from "@/lib/rag";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query requise" }, { status: 400 });
    }
    // Recherche vectorielle : retourne les 5 documents les plus proches
    const results = await searchDocuments(query, 5);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
