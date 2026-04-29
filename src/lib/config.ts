export const DB_CONFIG = {
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432"),
  database: process.env.PG_DATABASE || "ragdb",
};

export const EMBEDDING_MODEL = "nomic-embed-text";
export const EMBEDDING_DIM = 768;
export const CHAT_MODEL = "llama3.2";
export const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
export const JWT_SECRET = process.env.JWT_SECRET || "rag-app-secret-change-me";
