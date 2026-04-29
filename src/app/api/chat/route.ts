import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { askRAG } from "@/lib/rag";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  try {
    const { question, history } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Question requise" }, { status: 400 });
    }
    const result = await askRAG(question, history || []);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
