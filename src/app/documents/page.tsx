"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";

interface Doc {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function fetchDocs() {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.documents) setDocs(data.documents);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocs(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          metadata: { category: newCategory || "general", lang: "fr" },
        }),
      });
      if (res.ok) {
        setNewContent("");
        setNewCategory("");
        setShowForm(false);
        await fetchDocs();
      }
    } catch { /* ignore */ } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-200">Documents</h1>
            <p className="text-slate-500 text-sm mt-1">
              {docs.length} document{docs.length !== 1 ? "s" : ""} dans la base vectorielle
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (showForm
                ? "bg-[#1e293b] border border-[#334155] text-slate-400"
                : "bg-indigo-500 hover:bg-indigo-400 text-white")
            }
          >
            {showForm ? "Annuler" : "+ Ajouter"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Contenu</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-slate-200 placeholder-slate-600 min-h-[120px] resize-y transition-all"
                placeholder="Le contenu de ton document..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Categorie</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-slate-200 placeholder-slate-600 transition-all"
                placeholder="auth, billing, api, support..."
              />
            </div>
            <button
              type="submit"
              disabled={adding || !newContent.trim()}
              className="px-6 py-2 bg-green-500 hover:bg-green-400 text-white font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {adding ? "Ajout en cours (embedding)..." : "Ajouter le document"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            Aucun document. Clique sur &quot;+ Ajouter&quot; pour commencer.
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div key={doc.id} className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-relaxed">{doc.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-mono text-slate-600">#{doc.id}</span>
                      {doc.metadata?.category && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">
                          {String(doc.metadata.category)}
                        </span>
                      )}
                      {doc.metadata?.lang && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full">
                          {String(doc.metadata.lang)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
