// ============================================================
// POST /api/auth — Login, inscription et deconnexion
//
// Gere 3 actions via le champ "action" du body JSON :
//   - "register" : cree un compte + retourne un cookie JWT
//   - "login"    : verifie les identifiants + retourne un cookie JWT
//   - "logout"   : supprime le cookie JWT
//
// Le cookie est httpOnly (pas accessible en JavaScript cote client)
// et dure 7 jours.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { login, register, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    // --- INSCRIPTION ---
    if (action === "register") {
      // Validation des champs obligatoires
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: "Champs requis: email, name, password" },
          { status: 400 }
        );
      }
      try {
        // Creer l'utilisateur en base (mot de passe hashe avec bcrypt)
        const user = await register(email, name, password);
        // Generer le JWT
        const token = createToken(user);
        // Retourner l'utilisateur + set le cookie
        const res = NextResponse.json({ user });
        res.cookies.set("token", token, {
          httpOnly: true,    // Pas accessible en JS (protection XSS)
          sameSite: "lax",   // Protection CSRF basique
          maxAge: 60 * 60 * 24 * 7, // 7 jours en secondes
          path: "/",
        });
        return res;
      } catch (err: unknown) {
        // Gerer le cas ou l'email existe deja (contrainte UNIQUE)
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("duplicate key") || msg.includes("unique")) {
          return NextResponse.json(
            { error: "Cet email est deja utilise" },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    // --- CONNEXION ---
    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email et mot de passe requis" },
          { status: 400 }
        );
      }
      // Verifier email + mot de passe (bcrypt.compare)
      const user = await login(email, password);
      if (!user) {
        return NextResponse.json(
          { error: "Email ou mot de passe incorrect" },
          { status: 401 }
        );
      }
      // Generer le JWT et set le cookie
      const token = createToken(user);
      const res = NextResponse.json({ user });
      res.cookies.set("token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }

    // --- DECONNEXION ---
    if (action === "logout") {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete("token"); // Supprime le cookie JWT
      return res;
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
