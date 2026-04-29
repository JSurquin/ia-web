import { NextRequest, NextResponse } from "next/server";
import { login, register, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    if (action === "register") {
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: "Champs requis: email, name, password" },
          { status: 400 }
        );
      }
      try {
        const user = await register(email, name, password);
        const token = createToken(user);
        const res = NextResponse.json({ user });
        res.cookies.set("token", token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
        return res;
      } catch (err: unknown) {
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

    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email et mot de passe requis" },
          { status: 400 }
        );
      }
      const user = await login(email, password);
      if (!user) {
        return NextResponse.json(
          { error: "Email ou mot de passe incorrect" },
          { status: 401 }
        );
      }
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

    if (action === "logout") {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete("token");
      return res;
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
