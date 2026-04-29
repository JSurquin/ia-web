// ============================================================
// login/page.tsx — Page de connexion et d'inscription
//
// Deux modes (toggle en haut) :
//   - Connexion  : email + mot de passe
//   - Inscription : nom + email + mot de passe
//
// Au submit, appelle POST /api/auth avec action "login" ou "register".
// Si OK, le serveur set un cookie JWT et on redirige vers /chat.
// Si erreur, on affiche le message d'erreur en rouge.
//
// C'est un Client Component ("use client") car il utilise
// useState, useRouter et des event handlers.
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  // --- State ---
  const [isRegister, setIsRegister] = useState(false);  // true = mode inscription
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");                  // Uniquement pour l'inscription
  const [error, setError] = useState("");                // Message d'erreur affiche
  const [loading, setLoading] = useState(false);         // Spinner pendant l'appel API

  // --- Soumission du formulaire ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();       // Empecher le rechargement de la page
    setError("");             // Reset l'erreur precedente
    setLoading(true);

    try {
      // Appel API : login ou register selon le mode
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isRegister ? "register" : "login",
          email,
          password,
          name: isRegister ? name : undefined,
        }),
      });
      const data = await res.json();

      // Si erreur (401, 409, etc.) → afficher le message
      if (!res.ok) {
        setError(data.error || "Erreur inconnue");
        return;
      }

      // Si OK → le cookie JWT est set par le serveur → rediriger vers /chat
      router.push("/chat");
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="w-full max-w-md">
        {/* --- En-tete avec logo --- */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 mb-4">
            <span className="text-3xl font-bold text-indigo-400">R</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-200">RAG Assistant</h1>
          <p className="text-slate-500 mt-2">PGVector + Ollama — 100% local</p>
        </div>

        {/* --- Carte du formulaire --- */}
        <div className="bg-[#1e293b] rounded-2xl p-8 border border-[#334155]">
          {/* Toggle Connexion / Inscription */}
          <div className="flex mb-6 bg-[#0f172a] rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(""); }}
              className={
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all " +
                (!isRegister ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300")
              }
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(""); }}
              className={
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all " +
                (isRegister ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300")
              }
            >
              Inscription
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Champ Nom (uniquement en mode inscription) */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-slate-200 placeholder-slate-600 transition-all"
                  placeholder="Ton nom"
                  required
                />
              </div>
            )}

            {/* Champ Email */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-slate-200 placeholder-slate-600 transition-all"
                placeholder="ton@email.com"
                required
              />
            </div>

            {/* Champ Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-slate-200 placeholder-slate-600 transition-all"
                placeholder="••••••••"
                required
                minLength={4}
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Chargement..." : isRegister ? "Creer mon compte" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Tout tourne en local. Aucune donnee envoyee a l&apos;exterieur.
        </p>
      </div>
    </div>
  );
}
