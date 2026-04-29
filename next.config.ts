// ============================================================
// next.config.ts — Configuration Next.js
//
// serverExternalPackages : liste les packages npm qui ne doivent
// PAS etre bundled par le compilateur de Next.js.
// Ces packages utilisent des binaires natifs ou du code Node.js
// pur qui ne fonctionne pas dans un bundle webpack/turbopack.
//
//   - pg          : client PostgreSQL (bindings natifs)
//   - bcryptjs    : hash de mots de passe
//   - jsonwebtoken: generation/verification de JWT
// ============================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "bcryptjs", "jsonwebtoken"],
};

export default nextConfig;
