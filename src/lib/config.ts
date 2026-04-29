// ============================================================
// config.ts — Configuration centralisee
//
// Toutes les constantes de l'app sont ici.
// Chaque valeur peut etre surchargee par une variable
// d'environnement (fichier .env.local).
// ============================================================

// --- Connexion PostgreSQL ---
// Meme base que le projet CLI (~/git/ia)
// La base "ragdb" contient la table "documents" avec les embeddings
export const DB_CONFIG = {
  user: process.env.PG_USER || "postgres",         // Utilisateur PostgreSQL
  password: process.env.PG_PASSWORD || "postgres",  // Mot de passe
  host: process.env.PG_HOST || "localhost",          // Docker expose le port en local
  port: parseInt(process.env.PG_PORT || "5432"),     // Port standard PostgreSQL
  database: process.env.PG_DATABASE || "ragdb",      // Nom de la base
};

// --- Modele d'embedding ---
// nomic-embed-text genere des vecteurs de 768 dimensions
// Necessite le prefix "search_query:" pour les requetes
// et "search_document:" pour l'indexation
export const EMBEDDING_MODEL = "nomic-embed-text";

// --- Dimension des vecteurs ---
// Doit correspondre a la colonne VECTOR(768) dans PostgreSQL
// Si tu changes de modele d'embedding, change cette valeur aussi
export const EMBEDDING_DIM = 768;

// --- Modele LLM ---
// llama3.2 = 2B parametres, ~2 Go — le plus leger de la famille Llama
// Recoit le contexte (documents trouves) + la question → genere la reponse
export const CHAT_MODEL = "llama3.2";

// --- URL Ollama ---
// Ollama tourne en local sur le port 11434
// Utilise pour les embeddings (via LangChain) et le LLM (via HTTP)
export const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// --- Secret JWT ---
// Sert a signer les tokens d'authentification
// En prod, mettre une vraie cle secrete dans .env.local
export const JWT_SECRET = process.env.JWT_SECRET || "rag-app-secret-change-me";
