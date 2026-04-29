// ============================================================
// auth.ts — Authentification (inscription, login, JWT, session)
//
// Flow :
//   1. L'utilisateur s'inscrit ou se connecte via /api/auth
//   2. On hash le mot de passe avec bcrypt (10 rounds de salage)
//   3. On genere un JWT signe avec JWT_SECRET (valable 7 jours)
//   4. Le JWT est stocke dans un cookie httpOnly (pas accessible en JS)
//   5. A chaque requete protegee, getSession() verifie le cookie
//
// La table "users" est creee automatiquement au premier appel
// (CREATE TABLE IF NOT EXISTS).
// ============================================================

import bcrypt from "bcryptjs";       // Hash de mots de passe (bcrypt)
import jwt from "jsonwebtoken";       // Generation et verification de JWT
import { cookies } from "next/headers"; // Acces aux cookies dans les Server Components
import { JWT_SECRET } from "./config";
import { query } from "./db";

// Interface TypeScript pour un utilisateur
export interface User {
  id: number;
  email: string;
  name: string;
}

// Cree la table users si elle n'existe pas encore
// Appelee automatiquement a chaque register/login
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

// Inscrit un nouvel utilisateur
// Hash le mot de passe avec bcrypt (10 rounds = ~100ms)
// Retourne l'utilisateur cree (sans le hash)
export async function register(
  email: string,
  name: string,
  password: string
): Promise<User> {
  await initAuthTable();
  const hash = await bcrypt.hash(password, 10); // 10 = nombre de rounds de salage
  const res = await query(
    "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name",
    [email, name, hash]
  );
  return res.rows[0];
}

// Verifie les identifiants d'un utilisateur
// Compare le mot de passe en clair avec le hash stocke en base
// Retourne l'utilisateur si OK, null sinon
export async function login(
  email: string,
  password: string
): Promise<User | null> {
  await initAuthTable();
  const res = await query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [email]
  );
  if (res.rows.length === 0) return null; // Email pas trouve
  const user = res.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null; // Mauvais mot de passe
  return { id: user.id, email: user.email, name: user.name };
}

// Genere un JWT a partir des infos utilisateur
// Le token contient : id, email, name + date d'expiration
export function createToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" } // Le token expire dans 7 jours
  );
}

// Recupere la session courante depuis le cookie "token"
// Appele dans les API routes pour verifier l'authentification
// Retourne l'utilisateur si le token est valide, null sinon
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null; // Pas de cookie = pas connecte
  try {
    return jwt.verify(token, JWT_SECRET) as User; // Verifie la signature + expiration
  } catch {
    return null; // Token invalide ou expire
  }
}
