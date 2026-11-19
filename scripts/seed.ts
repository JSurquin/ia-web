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
// Les embeddings sont generes via Ollama (voir EMBEDDING_MODEL dans config.ts).
// Chaque document prend ~1 seconde a ingerer.
//
// Usage : npm run seed
// Prerequis : PostgreSQL + Ollama doivent tourner
// ============================================================

import pg from "pg";
import { OllamaEmbeddings } from "@langchain/ollama";
import {
  DB_CONFIG,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  OLLAMA_BASE_URL,
} from "../src/lib/config";

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

let currentStep = "demarrage";

function pgConnectionLabel() {
  return `${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;
}

function unwrapErrorMessage(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  const seen = new Set<unknown>();
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message) parts.push(current.message);
    current = current.cause;
  }
  if (parts.length === 0) {
    return typeof err === "string" ? err : String(err);
  }
  return parts.join(" → ");
}

function pgHint(code: string | undefined, message: string): string[] {
  const hints: string[] = [];
  switch (code) {
    case "ECONNREFUSED":
      hints.push("PostgreSQL ne repond pas sur " + DB_CONFIG.host + ":" + DB_CONFIG.port);
      hints.push("Lance la base : docker compose up -d");
      hints.push("Puis verifie : docker ps | grep pgvector");
      break;
    case "ENOTFOUND":
      hints.push("Hote PostgreSQL introuvable : " + DB_CONFIG.host);
      hints.push('Verifie PG_HOST ou utilise "localhost"');
      break;
    case "28P01":
      hints.push("Identifiants PostgreSQL invalides (PG_USER / PG_PASSWORD)");
      break;
    case "3D000":
      hints.push('La base "' + DB_CONFIG.database + '" n\'existe pas (PG_DATABASE)');
      hints.push(
        "Cree-la : docker exec pgvector psql -U postgres -c 'CREATE DATABASE " + DB_CONFIG.database + "'"
      );
      break;
    case "42501":
      if (/extension|vector/i.test(message)) {
        hints.push("L'utilisateur PostgreSQL n'a pas le droit de creer l'extension vector");
        hints.push("Utilise l'image pgvector/pgvector (voir docker-compose.yml)");
      }
      break;
    case "58P01":
    case "53100":
      hints.push("Erreur disque / fichiers cote PostgreSQL — consulte les logs du conteneur");
      hints.push("docker logs pgvector");
      break;
    default:
      if (/extension "vector" does not exist/i.test(message)) {
        hints.push("L'extension pgvector n'est pas disponible sur ce serveur PostgreSQL");
        hints.push("Utilise l'image pgvector/pgvector:pg16 (docker compose up -d)");
      }
      break;
  }
  return hints;
}

function ollamaHint(message: string): string[] {
  const hints: string[] = [];
  const url = OLLAMA_BASE_URL;
  if (/fetch failed|ECONNREFUSED|Failed to fetch|connect/i.test(message)) {
    hints.push("Ollama ne repond pas sur " + url);
    hints.push("Dans un autre terminal : ollama serve");
    hints.push("Variable optionnelle : OLLAMA_URL=" + url);
  }
  if (/not found|does not exist|404|model/i.test(message)) {
    hints.push('Modele requis : ollama pull ' + EMBEDDING_MODEL);
    hints.push("Liste des modeles : ollama list");
  }
  if (hints.length === 0) {
    hints.push("Verifie qu'Ollama tourne : curl " + url + "/api/tags");
    hints.push("Puis : ollama pull " + EMBEDDING_MODEL);
  }
  return hints;
}

function stepHints(step: string, err: unknown): string[] {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;
  const message = unwrapErrorMessage(err);

  if (
    step.startsWith("connexion PostgreSQL") ||
    step.startsWith("extension pgvector") ||
    step.startsWith("table ") ||
    step.startsWith("index HNSW") ||
    step.startsWith("comptage documents")
  ) {
    return pgHint(code, message);
  }
  if (step.startsWith("verification Ollama") || step.includes("ingestion documents")) {
    return ollamaHint(message);
  }
  return ["Relance avec plus de detail : DEBUG_SEED=1 pnpm run seed"];
}

function reportSeedFailure(err: unknown) {
  const message = unwrapErrorMessage(err);
  const pgCode =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;

  console.error("\n══════════════════════════════════════════════════");
  console.error("✗ Echec du seed (pnpm / npm affiche seulement ELIFECYCLE)");
  console.error("══════════════════════════════════════════════════");
  console.error("  Etape        : " + currentStep);
  console.error("  PostgreSQL   : " + pgConnectionLabel());
  console.error("  Ollama       : " + OLLAMA_BASE_URL + " (modele " + EMBEDDING_MODEL + ")");
  console.error("  Message      : " + message);
  if (pgCode && pgCode.length <= 10) {
    console.error("  Code erreur  : " + pgCode);
  }

  const hints = stepHints(currentStep, err);
  if (hints.length > 0) {
    console.error("\n  Pistes :");
    for (const h of hints) {
      console.error("    • " + h);
    }
  }

  console.error("\n  Variables utiles : PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE, OLLAMA_URL");
  console.error("══════════════════════════════════════════════════\n");

  if (process.env.DEBUG_SEED) {
    console.error("DEBUG_SEED — erreur complete :\n", err);
  }

  process.exit(1);
}

async function assertOllamaReady() {
  currentStep = "verification Ollama";
  const tagsUrl = OLLAMA_BASE_URL.replace(/\/$/, "") + "/api/tags";
  let res: Response;
  try {
    res = await fetch(tagsUrl);
  } catch (err) {
    const hint = unwrapErrorMessage(err);
    throw new Error("Impossible de joindre Ollama (" + tagsUrl + ") : " + hint, {
      cause: err instanceof Error ? err : undefined,
    });
  }

  if (!res.ok) {
    throw new Error("Ollama a repondu HTTP " + res.status + " sur " + tagsUrl);
  }

  const data = (await res.json()) as { models?: { name: string }[] };
  const names = data.models?.map((m) => m.name) ?? [];
  const hasEmbedModel = names.some(
    (n) => n === EMBEDDING_MODEL || n.startsWith(EMBEDDING_MODEL + ":")
  );

  if (!hasEmbedModel) {
    const listed = names.length ? names.join(", ") : "(aucun modele installe)";
    throw new Error(
      'Modele "' +
        EMBEDDING_MODEL +
        '" introuvable dans Ollama. Modeles vus : ' +
        listed +
        '. Lance : ollama pull ' +
        EMBEDDING_MODEL
    );
  }

  console.log("✓ Ollama pret (" + EMBEDDING_MODEL + ")\n");
}

async function seed() {
  const client = new pg.Client(DB_CONFIG);
  try {
    currentStep = "connexion PostgreSQL";
    await client.connect();
    console.log("✓ Connecte a PostgreSQL (" + pgConnectionLabel() + ")\n");

    // --- Etape 1 : Extension pgvector ---
    currentStep = "extension pgvector";
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("✓ Extension 'vector' activee");

    // --- Etape 2 : Table documents ---
    currentStep = "table documents";
    await client.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      embedding VECTOR(${EMBEDDING_DIM})
    )
  `);
    console.log("✓ Table 'documents' prete");

    // Colonne embedding : migrer la dimension si la table existait (ex. nomic 768 → harrier 1024)
    currentStep = "migration dimension embedding";
    await client.query("DROP INDEX IF EXISTS documents_embedding_idx");
    try {
      await client.query(
        `ALTER TABLE documents ALTER COLUMN embedding TYPE vector(${EMBEDDING_DIM})`
      );
    } catch (err) {
      const msg = unwrapErrorMessage(err);
      if (/dimension/i.test(msg)) {
        const n = (
          await client.query("SELECT count(*)::int AS n FROM documents")
        ).rows[0].n as number;
        if (n > 0) {
          console.log(
            `⚠ Anciens embeddings (${n} docs) incompatibles — TRUNCATE puis migration…`
          );
          await client.query("TRUNCATE documents RESTART IDENTITY");
        }
        await client.query(
          `ALTER TABLE documents ALTER COLUMN embedding TYPE vector(${EMBEDDING_DIM})`
        );
      } else {
        throw err;
      }
    }
    console.log(`✓ Colonne embedding en vector(${EMBEDDING_DIM})`);

    // --- Etape 3 : Table users ---
    currentStep = "table users";
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
    currentStep = "index HNSW";
    await client.query(`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents
    USING hnsw (embedding vector_cosine_ops)
  `);
    console.log("✓ Index HNSW cree\n");

    // --- Etape 5 : Verifier si des documents existent deja ---
    currentStep = "comptage documents";
    const countRes = await client.query("SELECT count(*) FROM documents");
    const count = parseInt(countRes.rows[0].count);
    if (count > 0) {
      console.log(`La base contient deja ${count} documents. Seed ignore.`);
      console.log("Pour re-seeder, vide la table d'abord :");
      console.log("  docker exec pgvector psql -U postgres -d ragdb -c 'TRUNCATE documents RESTART IDENTITY'\n");
      return;
    }

    // --- Etape 6 : Ingerer les documents ---
    await assertOllamaReady();

    const embeddings = new OllamaEmbeddings({
      model: EMBEDDING_MODEL,
      baseUrl: OLLAMA_BASE_URL,
    });

    console.log(`Ingestion de ${SAMPLE_DOCS.length} documents (Ollama, ~1 s/doc)...\n`);

    for (let i = 0; i < SAMPLE_DOCS.length; i++) {
      const doc = SAMPLE_DOCS[i];
      currentStep = "ingestion documents " + (i + 1) + "/" + SAMPLE_DOCS.length;

      let vector: number[];
      try {
        [vector] = await embeddings.embedDocuments([doc.content]);
      } catch (err) {
        throw new Error(
          "Embedding Ollama echoue pour le document " + (i + 1) + "/" + SAMPLE_DOCS.length,
          { cause: err instanceof Error ? err : undefined }
        );
      }

      if (!vector?.length) {
        throw new Error(
          "Embedding vide pour le document " + (i + 1) + " (attendu " + EMBEDDING_DIM + " dimensions)"
        );
      }

      // Inserer dans PostgreSQL
      try {
        await client.query(
          "INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)",
          [doc.content, JSON.stringify(doc.metadata), JSON.stringify(vector)]
        );
      } catch (err) {
        throw new Error("INSERT PostgreSQL echoue pour le document " + (i + 1), {
          cause: err instanceof Error ? err : undefined,
        });
      }

      console.log("  [+] " + doc.content.slice(0, 60) + "...");
    }

    console.log(`\n✓ ${SAMPLE_DOCS.length} documents injectes avec succes !`);
    console.log("\nTu peux maintenant lancer l'app : npm run dev");
  } finally {
    await client.end().catch(() => {});
  }
}

seed().catch(reportSeedFailure);
