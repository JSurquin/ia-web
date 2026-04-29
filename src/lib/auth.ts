import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { JWT_SECRET } from "./config";
import { query } from "./db";

export interface User {
  id: number;
  email: string;
  name: string;
}

export async function initAuthTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function register(
  email: string,
  name: string,
  password: string
): Promise<User> {
  await initAuthTable();
  const hash = await bcrypt.hash(password, 10);
  const res = await query(
    "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name",
    [email, name, hash]
  );
  return res.rows[0];
}

export async function login(
  email: string,
  password: string
): Promise<User | null> {
  await initAuthTable();
  const res = await query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [email]
  );
  if (res.rows.length === 0) return null;
  const user = res.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export function createToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as User;
  } catch {
    return null;
  }
}
