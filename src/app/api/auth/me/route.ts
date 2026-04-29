// ============================================================
// GET /api/auth/me — Session courante
//
// Verifie le cookie JWT et retourne l'utilisateur connecte.
// Utilise par le composant AuthGuard pour proteger les pages.
// Retourne 401 si pas de cookie ou token invalide/expire.
// ============================================================

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  // getSession() lit le cookie "token" et verifie le JWT
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
