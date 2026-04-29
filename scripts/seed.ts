// ============================================================
// seed.ts — Initialise la base de donnees + injecte les documents
//
// Ce script fait tout d'un coup :
//   1. Active l'extension pgvector
//   2. Cree la table "documents" (si elle n'existe pas)
//   3. Cree la table "users" (si elle n'existe pas)
//   4. Cree l'index HNSW pour la recherche rapide
//   5. Injecte 10 documents exemple avec leurs embeddings
//
// Les embeddings sont generes via Ollama (nomic-embed-text).
// Chaque document prend ~1 seconde a ingerer.
//
// Usage : npm run seed
// Prerequis : PostgreSQL + Ollama doivent tourner
// ============================================================

import pg from "pg";
import { OllamaEmbeddings } from "@langchain/ollama";

// --- Config (meme valeurs que src/lib/config.ts) ---
const DB_CONFIG = {
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432"),
  database: process.env.PG_DATABASE || "ragdb",
};
const EMBEDDING_MODEL = "nomic-embed-text";
const EMBEDDING_DIM = 768;
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// --- Documents exemple ---
// Ce sont les documents qui alimentent le RAG.
// L'agent cherche dedans quand tu poses une question.
// En production, tu remplacerais ca par tes vrais documents
// (FAQ, docs techniques, base de connaissances, etc.)
const SAMPLE_DOCS = [
  {
    content:
      "Pour réinitialiser votre mot de passe, allez dans Paramètres > Sécurité > Réinitialiser le mot de passe. Un email de confirmation vous sera envoyé.",
    metadata: { category: "auth", lang: "fr" },
  },
  {
    content:
      "To reset your password, go to Settings > Security > Reset Password. A confirmation email will be sent to you.",
    metadata: { category: "auth", lang: "en" },
  },
  {
    content:
      "La facturation se fait automatiquement le 1er de chaque mois. Vous pouvez consulter vos factures dans Paramètres > Facturation.",
    metadata: { category: "billing", lang: "fr" },
  },
  {
    content:
      "Pour ajouter un nouveau membre à votre équipe, allez dans Paramètres > Équipe > Inviter un membre. Saisissez son email et choisissez son rôle.",
    metadata: { category: "team", lang: "fr" },
  },
  {
    content:
      "Notre API REST est accessible à https://api.example.com/v2. L'authentification se fait par Bearer token dans le header Authorization.",
    metadata: { category: "api", lang: "fr" },
  },
  {
    content:
      "En cas de panne, consultez notre page de statut à https://status.example.com. Vous pouvez aussi contacter le support à support@example.com.",
    metadata: { category: "support", lang: "fr" },
  },
  {
    content:
      "Les exports de données sont disponibles au format CSV et JSON. Allez dans Données > Exporter et sélectionnez le format souhaité.",
    metadata: { category: "data", lang: "fr" },
  },
  {
    content:
      "L'intégration Slack est disponible dans Paramètres > Intégrations > Slack. Cliquez sur Connecter et autorisez l'accès.",
    metadata: { category: "integrations", lang: "fr" },
  },
  {
    content:
      "Pour activer l'authentification à deux facteurs (2FA), allez dans Paramètres > Sécurité > 2FA. Scannez le QR code avec votre app d'authentification.",
    metadata: { category: "auth", lang: "fr" },
  },
  {
    content:
      "Les webhooks permettent de recevoir des notifications en temps réel. Configurez-les dans Paramètres > API > Webhooks.",
    metadata: { category: "api", lang: "fr" },
  },
];

async function seed() {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();
  console.log("✓ Connecte a PostgreSQL\n");

  // --- Etape 1 : Extension pgvector ---
  await client.query("CREATE EXTENSION IF NOT EXISTS vector");
  console.log("✓ Extension 'vector' activee");

  // --- Etape 2 : Table documents ---
  await client.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      embedding VECTOR(${EMBEDDING_DIM})
    )
  `);
  console.log("✓ Table 'documents' prete");

  // --- Etape 3 : Table users ---
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✓ Table 'users' prete");

  // --- Etape 4 : Index HNSW ---
  await client.query(`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents
    USING hnsw (embedding vector_cosine_ops)
  `);
  console.log("✓ Index HNSW cree\n");

  // --- Etape 5 : Verifier si des documents existent deja ---
  const countRes = await client.query("SELECT count(*) FROM documents");
  const count = parseInt(countRes.rows[0].count);
  if (count > 0) {
    console.log(`La base contient deja ${count} documents. Seed ignore.`);
    console.log("Pour re-seeder, vide la table d'abord :");
    console.log("  docker exec pgvector psql -U postgres -d ragdb -c 'TRUNCATE documents RESTART IDENTITY'\n");
    await client.end();
    return;
  }

  // --- Etape 6 : Ingerer les documents ---
  const embeddings = new OllamaEmbeddings({
    model: EMBEDDING_MODEL,
    baseUrl: OLLAMA_BASE_URL,
  });

  console.log(`Ingestion de ${SAMPLE_DOCS.length} documents...\n`);

  for (const doc of SAMPLE_DOCS) {
    // Generer l'embedding avec le prefix "search_document:" requis par nomic-embed-text
    const [vector] = await embeddings.embedDocuments(["search_document: " + doc.content]);

    // Inserer dans PostgreSQL
    await client.query(
      "INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)",
      [doc.content, JSON.stringify(doc.metadata), JSON.stringify(vector)]
    );

    console.log("  [+] " + doc.content.slice(0, 60) + "...");
  }

  await client.end();
  console.log(`\n✓ ${SAMPLE_DOCS.length} documents injectes avec succes !`);
  console.log("\nTu peux maintenant lancer l'app : npm run dev");
}

seed().catch((err) => {
  console.error("\n✗ Seed echoue:", err.message);
  process.exit(1);
});
