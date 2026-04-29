// ============================================================
// layout.tsx — Layout racine de l'application
//
// C'est le conteneur HTML de toutes les pages.
// Il charge :
//   - Les polices Google (Geist Sans + Geist Mono)
//   - Le fichier CSS global (globals.css)
//   - Les metadonnees de la page (title, description)
//
// Toutes les pages (login, chat, documents) sont rendues
// dans {children} a l'interieur du <body>.
// ============================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Chargement des polices Google avec variables CSS
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Metadonnees HTML (balises <title> et <meta>)
export const metadata: Metadata = {
  title: "RAG Assistant",
  description: "RAG avec PGVector + Ollama",
};

// Layout racine : wrap toutes les pages dans <html> + <body>
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geistSans.variable + " " + geistMono.variable}>
      <body>{children}</body>
    </html>
  );
}
