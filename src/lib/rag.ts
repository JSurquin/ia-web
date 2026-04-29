import { OllamaEmbeddings } from "@langchain/ollama";
import { EMBEDDING_MODEL, CHAT_MODEL, OLLAMA_BASE_URL } from "./config";
import { query } from "./db";

const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

export interface SearchResult {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function searchDocuments(
  userQuery: string,
  topK = 3
): Promise<SearchResult[]> {
  const vector = await embeddings.embedQuery("search_query: " + userQuery);
  const res = await query(
    "SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity FROM documents ORDER BY embedding <=> $1::vector LIMIT $2",
    [JSON.stringify(vector), topK]
  );
  return res.rows;
}

export async function ingestDocument(
  content: string,
  metadata: Record<string, unknown> = {}
) {
  const [vector] = await embeddings.embedDocuments([
    "search_document: " + content,
  ]);
  await query(
    "INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)",
    [content, JSON.stringify(metadata), JSON.stringify(vector)]
  );
}

export async function deleteDocument(id: number) {
  await query("DELETE FROM documents WHERE id = $1", [id]);
}

export async function getAllDocuments() {
  const res = await query(
    "SELECT id, content, metadata FROM documents ORDER BY id DESC"
  );
  return res.rows;
}

function buildPrompt(
  question: string,
  context: string,
  history: { role: string; content: string }[]
): string {
  const parts = [
    "Tu es un assistant technique intelligent.",
    "Reponds aux questions en te basant sur le contexte fourni.",
    "Si le contexte ne contient pas l'information, dis-le clairement.",
    "Reponds de maniere concise et utile.",
    "",
    "Contexte:",
    context,
  ];

  if (history.length > 0) {
    parts.push("", "Historique:");
    for (const m of history) {
      const label = m.role === "user" ? "Utilisateur" : "Assistant";
      parts.push(label + ": " + m.content);
    }
  }

  parts.push("", "Utilisateur: " + question, "", "Assistant:");
  return parts.join("\n");
}

export async function askRAG(
  question: string,
  history: { role: string; content: string }[] = []
): Promise<{ answer: string; sources: SearchResult[] }> {
  const docs = await searchDocuments(question);
  const context = docs.map((d) => d.content).join("\n\n");
  const prompt = buildPrompt(question, context, history);

  const res = await fetch(OLLAMA_BASE_URL + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: CHAT_MODEL, prompt, stream: false }),
  });

  if (!res.ok) {
    throw new Error("LLM error: " + res.status + " " + res.statusText);
  }

  const data = await res.json();
  return { answer: data.response, sources: docs };
}
