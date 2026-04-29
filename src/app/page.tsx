// ============================================================
// page.tsx — Page d'accueil (/)
//
// Redirige automatiquement :
//   - Vers /chat si l'utilisateur est connecte
//   - Vers /login sinon
//
// C'est un Server Component (pas de "use client") donc
// getSession() peut lire les cookies cote serveur.
// ============================================================

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  redirect(user ? "/chat" : "/login");
}
