import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllDocuments, ingestDocument, deleteDocument } from "@/lib/rag";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }
  try {
    const docs = await getAllDocuments();
    return NextResponse.json({ documents: docs });
  } catch (err) {
    console.error("Documents GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }
  try {
    const { content, metadata } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
    }
    await ingestDocument(content, metadata || {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Documents POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await deleteDocument(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Documents DELETE error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
