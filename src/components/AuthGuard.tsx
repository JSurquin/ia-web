// ============================================================
// AuthGuard.tsx — Composant de protection des pages
//
// Enveloppe les pages qui necessitent une authentification.
// Au montage, il appelle GET /api/auth/me pour verifier
// si l'utilisateur est connecte.
//
// - Si connecte   → affiche la Navbar + le contenu de la page
// - Si pas connecte → redirige vers /login
// - Pendant la verification → affiche un spinner de chargement
//
// Utilisation dans une page :
//   <AuthGuard>
//     <div>Contenu protege</div>
//   </AuthGuard>
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";

interface User {
  id: number;
  email: string;
  name: string;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Au montage du composant, verifier la session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);     // Connecte → stocker l'utilisateur
        } else {
          router.push("/login");  // Pas connecte → rediriger
        }
      })
      .catch(() => router.push("/login")) // Erreur reseau → rediriger
      .finally(() => setLoading(false));
  }, [router]);

  // Pendant la verification, afficher un spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Si pas connecte (en attente de redirection), ne rien afficher
  if (!user) return null;

  // Connecte → afficher la navbar + le contenu de la page
  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      <Navbar userName={user.name} />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
