// ============================================================
// chat/page.tsx — Interface chat RAG
//
// C'est la page principale de l'app. L'utilisateur pose des
// questions et l'agent RAG repond en utilisant les documents
// de la base vectorielle.
//
// Fonctionnement :
//   1. L'utilisateur tape sa question (ou clique une suggestion)
//   2. La question est ajoutee dans le state messages[]
//   3. On appelle POST /api/chat avec la question + l'historique
//   4. L'API retourne la reponse + les sources (documents trouves)
//   5. La reponse est ajoutee dans messages[] et affichee
//
// Le chat affiche :
//   - Les messages user (bulle indigo, a droite)
//   - Les messages assistant (bulle sombre, a gauche)
//   - Les sources sous chaque reponse (avec score de similarite)
//   - Un spinner pendant le chargement
//   - Un bouton poubelle pour effacer la conversation
// ============================================================

"use client";

import { useState, useRef, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";

// Type d'un message dans la conversation
interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { content: string; similarity: number }[];
  webResults?: { title: string; snippet: string; url: string }[];
}

export default function ChatPage() {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);        // Toggle recherche web
  const [searchPhase, setSearchPhase] = useState("");       // Phase affichee pendant le chargement

  // --- Refs ---
  const bottomRef = useRef<HTMLDivElement>(null);   // Pour scroll automatique en bas
  const inputRef = useRef<HTMLInputElement>(null);  // Pour focus automatique du champ

  // Scroll en bas a chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus le champ de saisie au chargement de la page
  useEffect(() => { inputRef.current?.focus(); }, []);

  // --- Soumission d'une question ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      // Afficher la phase de recherche
      setSearchPhase("Recherche dans la documentation...");
      if (webSearch) {
        // Petit delai pour que l'utilisateur voit la phase docs avant le web
        setTimeout(() => setSearchPhase("Recherche en ligne en cours..."), 1500);
      }

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history, webSearch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          webResults: data.webResults,
        },
      ]);
    } catch (err) {
      // En cas d'erreur, afficher le message d'erreur comme reponse
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setMessages((prev) => [...prev, { role: "assistant", content: "Erreur: " + msg }]);
    } finally {
      setLoading(false);
      setSearchPhase("");
      inputRef.current?.focus();
    }
  }

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* --- Zone des messages (scrollable) --- */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Ecran d'accueil (quand aucun message) */}
          {messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-500/10 mb-6">
                  <span className="text-4xl">💬</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Pose ta question</h2>
                <p className="text-slate-500 max-w-md">
                  Je cherche dans la base de documents et je te reponds avec le contexte pertinent.
                </p>
                {/* Suggestions cliquables */}
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {[
                    "Comment reinitialiser mon mot de passe ?",
                    "Comment fonctionne la facturation ?",
                    "Comment utiliser l'API ?",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-sm px-4 py-2 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-slate-400 hover:text-slate-200 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Liste des messages */}
          {messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className="max-w-[80%]">
                {/* Bulle du message */}
                <div
                  className={
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed " +
                    (msg.role === "user"
                      ? "bg-indigo-500 text-white rounded-br-md"              // User : indigo, droite
                      : "bg-[#1e293b] border border-[#334155] text-slate-200 rounded-bl-md") // Assistant : sombre, gauche
                  }
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Sources docs (affiches sous la reponse de l'assistant) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-500 ml-1">📄 Documentation interne :</p>
                    {msg.sources.map((s, j) => (
                      <div key={j} className="text-xs bg-[#1e293b]/50 border border-[#334155]/50 rounded-lg px-3 py-2 text-slate-500">
                        <span className="text-cyan-400 font-mono">{(s.similarity * 100).toFixed(0)}%</span>
                        {" — "}
                        {s.content.length > 100 ? s.content.slice(0, 100) + "..." : s.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sources web (affiches si la recherche web etait activee) */}
                {msg.webResults && msg.webResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-500 ml-1">🌐 Resultats web :</p>
                    {msg.webResults.map((w, j) => (
                      <a
                        key={j}
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs bg-[#1e293b]/50 border border-[#334155]/50 rounded-lg px-3 py-2 text-slate-500 hover:border-indigo-500/50 hover:text-slate-400 transition-colors"
                      >
                        <span className="text-indigo-400 font-medium">{w.title}</span>
                        <span className="block mt-0.5">{w.snippet.length > 120 ? w.snippet.slice(0, 120) + "..." : w.snippet}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Indicateur de chargement avec message de phase */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1e293b] border border-[#334155] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  {searchPhase && (
                    <span className="text-xs text-slate-500 italic">{searchPhase}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ancre pour le scroll automatique */}
          <div ref={bottomRef} />
        </div>

        {/* --- Barre de saisie (en bas) --- */}
        <div className="border-t border-[#334155] p-4 space-y-2">
          {/* Toggle recherche web */}
          <div className="flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={() => setWebSearch(!webSearch)}
              className={"relative inline-flex h-5 w-9 items-center rounded-full transition-colors " + (webSearch ? "bg-indigo-500" : "bg-[#334155]")}
              title="Rechercher aussi sur internet"
            >
              <span className={"inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform " + (webSearch ? "translate-x-4.5" : "translate-x-0.5")} />
            </button>
            <span className={"text-xs transition-colors " + (webSearch ? "text-indigo-400" : "text-slate-500")}>
              🌐 Recherche web
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                title="Effacer le chat"
              >
                🗑️
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={webSearch ? "Pose ta question (docs + web)..." : "Pose ta question..."}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-slate-200 placeholder-slate-600 transition-all disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
