// ============================================================
// db.ts — Pool de connexions PostgreSQL
//
// On utilise un Pool (pas un Client) car Next.js peut avoir
// plusieurs requetes en parallele. Le Pool gere un ensemble
// de connexions reutilisables automatiquement.
//
// Le pattern singleton (variable globale) evite de creer
// un nouveau Pool a chaque requete API.
// ============================================================

import pg from "pg";
import { DB_CONFIG } from "./config";

const { Pool } = pg;

// Singleton : une seule instance du Pool pour toute l'app
let pool: pg.Pool | null = null;

// Retourne le Pool existant ou en cree un nouveau
export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool(DB_CONFIG);
  }
  return pool;
}

// Raccourci pour executer une requete SQL
// Utilisation : await query("SELECT * FROM users WHERE id = $1", [42])
export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  return p.query(text, params);
}
