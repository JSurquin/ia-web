import pg from "pg";
import { DB_CONFIG } from "./config";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool(DB_CONFIG);
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  return p.query(text, params);
}
