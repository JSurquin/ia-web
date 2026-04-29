// ============================================================
// POST /api/chat — Pipeline RAG complet
//
// C'est le coeur de l'app. Recoit une question + l'historique
// de conversation, et retourne la reponse du LLM + les sources.
//
// Flow interne (dans askRAG) :
//   1. Question → embedding via Ollama (nomic-embed-text)
//   2. Embedding → pgvector → top 3 documents similaires
//   3. Documents + question + historique → prompt
//   4. Prompt → LLM Ollama (llama3.2) → reponse
//
// Necessite d'etre authentifie (cookie JWT).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { askRAG } from "@/lib/rag";

export async function POST(req: NextRequest) {
  // Verifier que l'utilisateur est connecte
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  try {
    const { question, history, webSearch } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Question requise" }, { status: 400 });
    }
    // Lancer le pipeline RAG complet
    // webSearch = true → recherche aussi sur internet (DuckDuckGo)
    const result = await askRAG(question, history || [], webSearch === true);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
