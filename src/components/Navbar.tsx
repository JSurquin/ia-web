// ============================================================
// Navbar.tsx — Barre de navigation
//
// Affichee en haut de toutes les pages protegees (via AuthGuard).
// Contient :
//   - Logo + nom de l'app (lien vers /chat)
//   - Liens de navigation : Chat, Documents
//   - Nom de l'utilisateur + bouton deconnexion
//
// Le lien actif est mis en surbrillance (indigo) grace a usePathname().
// La deconnexion appelle POST /api/auth { action: "logout" }
// puis redirige vers /login.
// ============================================================

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar({ userName }: { userName: string }) {
  const pathname = usePathname();   // URL courante (pour le lien actif)
  const router = useRouter();

  // Appel API pour deconnecter + redirection vers /login
  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  // Liste des liens de navigation
  const links = [
    { href: "/chat", label: "Chat" },
    { href: "/documents", label: "Documents" },
  ];

  return (
    <nav className="bg-[#1e293b] border-b border-[#334155] px-6 py-3 flex items-center justify-between">
      {/* Partie gauche : logo + liens */}
      <div className="flex items-center gap-6">
        <Link href="/chat" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <span className="text-indigo-400 text-sm font-bold">R</span>
          </div>
          <span className="font-semibold text-slate-200">RAG Assistant</span>
        </Link>

        {/* Liens de navigation avec highlight du lien actif */}
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                "px-3 py-2 rounded-lg text-sm font-medium transition-all " +
                (pathname === link.href
                  ? "bg-indigo-500/20 text-indigo-400"          // Lien actif
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#334155]") // Lien inactif
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Partie droite : nom utilisateur + deconnexion */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">{userName}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          Deconnexion
        </button>
      </div>
    </nav>
  );
}
