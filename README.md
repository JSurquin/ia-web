# RAG Assistant — Interface Web

Application web RAG (Retrieval-Augmented Generation) avec Next.js, PostgreSQL + pgvector et Ollama.
C'est l'interface web du projet `ia` (CLI). Les deux partagent la meme base de donnees.

---

## Comment ca marche

```
┌──────────────────────────────────────────────────────────┐
│                      PIPELINE RAG                         │
│                                                           │
│   Navigateur (Next.js)                                    │
│       │                                                   │
│       ▼                                                   │
│   POST /api/chat   { question, history }                  │
│       │                                                   │
│       ├──► Ollama (nomic-embed-text)                      │
│       │        → transforme la question en vecteur 768d   │
│       │                                                   │
│       ├──► PostgreSQL + pgvector                          │
│       │        → SELECT ... ORDER BY embedding <=> $1     │
│       │        → retourne les 3 docs les plus proches     │
│       │                                                   │
│       ├──► Ollama (llama3.2)                              │
│       │        → recoit contexte + question + historique  │
│       │        → genere la reponse                        │
│       │                                                   │
│       ▼                                                   │
│   { answer, sources[] }  → affiche dans le chat           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Prerequis

| Outil       | Installation                       | Pourquoi                        |
|-------------|------------------------------------|---------------------------------|
| OrbStack    | `brew install orbstack`            | Docker pour PostgreSQL          |
| Node.js     | >= 18 (`brew install node`)        | Runtime Next.js                 |
| Ollama      | `brew install ollama`              | LLM + Embeddings en local      |
| Projet `ia` | `~/git/ia` (le projet CLI)         | docker-compose.yml + seed data  |

---

## Installation

```bash
# 1. Cloner le projet
cd ~/git/ia-web

# 2. Installer les dependances
npm install

# 3. Telecharger les modeles Ollama (a faire une seule fois)
ollama pull nomic-embed-text   # Modele d'embedding (274 Mo) — transforme le texte en vecteur 768d
ollama pull llama3.2           # Modele LLM (2 Go) — genere les reponses a partir du contexte
```

---

## Lancement

Tu as besoin de 3 choses qui tournent :

### Terminal 1 — Ollama

```bash
ollama serve
```

> Ollama fait tourner les 2 modeles :
> - **nomic-embed-text** : genere les embeddings (vecteurs) pour la recherche semantique
> - **llama3.2** (2B params) : genere les reponses du chat a partir des documents trouves

### Terminal 2 — PostgreSQL (Docker)

```bash
# Demarrer OrbStack si pas deja lance
orb start

# Lancer PostgreSQL + pgvector
cd ~/git/ia
docker compose up -d
```

Si c'est la premiere fois, initialise la base et injecte les documents :

```bash
cd ~/git/ia
npm run setup
```

### Terminal 3 — Next.js

```bash
cd ~/git/ia-web
npm run dev
```

Puis ouvre **http://localhost:3000**.

---

## Utilisation pas a pas

### 1. Inscription

- Va sur http://localhost:3000
- Tu arrives sur la page de login
- Clique sur "Inscription"
- Remplis : nom, email, mot de passe (min 4 caracteres)
- Clique "Creer mon compte"
- Tu es redirige vers le chat

### 2. Chat RAG

- Tape ta question dans le champ en bas
- Ou clique sur une suggestion ("Comment reinitialiser mon mot de passe ?")
- L'agent :
  1. Transforme ta question en vecteur (embedding)
  2. Cherche les 3 documents les plus proches dans pgvector
  3. Envoie le contexte + ta question au LLM
  4. Affiche la reponse + les sources avec leur score de similarite
- L'historique de conversation est envoye au LLM a chaque question
- Clique sur la poubelle pour effacer le chat

### 3. Gestion des documents

- Clique sur "Documents" dans la navbar
- Tu vois tous les documents de la base vectorielle
- Clique "+ Ajouter" pour ajouter un document :
  - Ecris le contenu (texte)
  - Donne une categorie (optionnel)
  - L'embedding est genere automatiquement
- Survole un document et clique la poubelle pour le supprimer

### 4. Deconnexion

- Clique "Deconnexion" en haut a droite
- Le cookie JWT est supprime
- Tu es redirige vers le login

---

## Structure du projet

```
ia-web/
├── next.config.ts                   ← Config Next.js (packages serveur)
├── package.json                     ← Dependances + scripts
│
├── src/
│   ├── lib/                         ← Logique metier (serveur)
│   │   ├── config.ts                ← Constantes (DB, modeles, URLs, JWT)
│   │   ├── db.ts                    ← Pool de connexions PostgreSQL
│   │   ├── auth.ts                  ← Inscription, login, JWT, session
│   │   └── rag.ts                   ← Recherche vectorielle, ingestion, LLM
│   │
│   ├── components/                  ← Composants React reutilisables
│   │   ├── AuthGuard.tsx            ← Protege les pages (verifie la session)
│   │   └── Navbar.tsx               ← Barre de navigation
│   │
│   └── app/                         ← Pages + API routes (App Router)
│       ├── layout.tsx               ← Layout racine (polices, CSS)
│       ├── page.tsx                 ← Redirect / → /chat ou /login
│       ├── globals.css              ← Styles globaux (dark theme)
│       │
│       ├── login/
│       │   └── page.tsx             ← Page connexion / inscription
│       │
│       ├── chat/
│       │   └── page.tsx             ← Interface chat RAG
│       │
│       ├── documents/
│       │   └── page.tsx             ← Admin des documents
│       │
│       └── api/
│           ├── auth/
│           │   ├── route.ts         ← POST: login / register / logout
│           │   └── me/
│           │       └── route.ts     ← GET: session courante
│           ├── chat/
│           │   └── route.ts         ← POST: pipeline RAG complet
│           ├── search/
│           │   └── route.ts         ← POST: recherche semantique seule
│           └── documents/
│               └── route.ts         ← GET / POST / DELETE: CRUD documents
```

---

## API Routes

### `POST /api/auth`

Gere login, inscription et deconnexion via le champ `action`.

| action     | Body                              | Reponse                    |
|------------|-----------------------------------|----------------------------|
| `register` | `{ email, name, password }`       | `{ user }` + cookie JWT    |
| `login`    | `{ email, password }`             | `{ user }` + cookie JWT    |
| `logout`   | `{}`                              | `{ ok }` + supprime cookie |

### `GET /api/auth/me`

Retourne l'utilisateur connecte a partir du cookie JWT.

### `POST /api/chat`

Pipeline RAG complet. Necessite d'etre authentifie.

```json
// Request
{ "question": "Comment reinitialiser mon mot de passe ?", "history": [] }

// Response
{
  "answer": "Pour reinitialiser votre mot de passe, allez dans...",
  "sources": [
    { "id": 1, "content": "Pour reinitialiser...", "similarity": 0.71, "metadata": {} }
  ]
}
```

### `POST /api/search`

Recherche semantique seule (sans LLM). Retourne les 5 documents les plus proches.

```json
// Request
{ "query": "facturation" }

// Response
{ "results": [ { "id": 3, "content": "...", "similarity": 0.60 } ] }
```

### `GET /api/documents`

Liste tous les documents de la base.

### `POST /api/documents`

Ajoute un document (genere l'embedding automatiquement).

```json
{ "content": "Ton texte ici", "metadata": { "category": "support" } }
```

### `DELETE /api/documents`

Supprime un document par ID.

```json
{ "id": 3 }
```

---

## Technologies

| Composant     | Techno                        | Role                                |
|---------------|-------------------------------|-------------------------------------|
| Frontend      | Next.js 16 (App Router)       | Pages React + API routes            |
| CSS           | Tailwind CSS 4                | Styles (dark theme)                 |
| Auth          | bcryptjs + jsonwebtoken       | Hash passwords + JWT httpOnly       |
| Vector DB     | PostgreSQL 16 + pgvector      | Stockage et recherche vectorielle   |
| Embeddings    | nomic-embed-text (768 dim)    | Texte → vecteur                     |
| LLM           | llama3.2 (2B params)          | Genere les reponses                 |
| Runtime IA    | Ollama                        | Fait tourner les modeles en local   |
| ORM/DB        | pg (node-postgres)            | Connexion PostgreSQL                |
| Embeddings SDK| @langchain/ollama             | Interface LangChain pour embeddings |

---

## Relation avec le projet CLI (`~/git/ia`)

Les deux projets partagent :
- La meme base PostgreSQL (`ragdb`) avec la meme table `documents`
- Les memes modeles Ollama (`nomic-embed-text` + `llama3.2`)
- Le meme `docker-compose.yml` (dans `~/git/ia`)

Tu peux ajouter des documents depuis le CLI (`npm run ingest`) et les retrouver dans l'interface web, et vice versa.

---

## Variables d'environnement (optionnel)

Tout marche avec les valeurs par defaut. Pour personnaliser, cree un `.env.local` :

```bash
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=ragdb
OLLAMA_URL=http://localhost:11434
JWT_SECRET=change-moi-en-prod
```

---

## Troubleshooting

| Probleme                              | Solution                                              |
|---------------------------------------|-------------------------------------------------------|
| `npm run dev` plante                  | Verifier que PostgreSQL + Ollama tournent              |
| "Non authentifie" sur /chat           | Se connecter sur /login d'abord                       |
| Reponses lentes (30s+)               | Normal, llama3.2 tourne sur CPU — premier appel = lent|
| "Erreur serveur" sur le chat          | Verifier `ollama serve` dans un terminal               |
| Documents non trouves dans la recherche| Verifier que `npm run ingest` a ete lance (projet ia) |
| OrbStack ne demarre pas Docker       | Lancer `orb start` avant `docker compose up`           |
