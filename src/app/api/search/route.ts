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
    const results = await searchDocuments(query, 5);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
