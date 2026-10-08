# Tripfolio

A social travel app built around an interactive world map. Mark the countries you've visited and the ones you want to visit, keep trips with dates, photos and notes, and explore the world through the people you follow.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · TanStack Query · Zustand (UI state) · Drizzle ORM · PostgreSQL 17 · S3-compatible storage (RustFS locally) · d3-geo map · zod

## Getting started

Requires Node 20+ and Docker Desktop.

```bash
npm install
cp .env.example .env.local      # defaults match docker-compose.yml
docker compose up -d            # PostgreSQL + S3 storage (creates the photos bucket)
npm run db:setup                # migrate + load countries + demo community
npm run dev
```

Open http://localhost:3000 and use **“Just looking?”** on the login page, or sign in as `demo@tripfolio.app` / `tripfolio123`. All demo accounts use the password `tripfolio123`.

The seed also creates a community of **21 travelers** with real photos: **@daniel.wanders** plus 20 more defined in `src/server/db/seed-travelers.json` (10 male, 10 female, 2–3 countries each, 110 photos in total). Photos are downloaded from Wikimedia Commons at seed time (freely licensed; photographers and licenses are credited under each trip's gallery). This step needs an internet connection and takes about a minute and a half; if a download fails the trip is still created, just without that photo.

In development, emails (password resets) are printed in the terminal running `npm run dev`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / server |
| `npm run db:generate` | Create a migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load countries + demo users (idempotent) |
| `npm run db:studio` | Browse the database |
| `npm run countries` | Rebuild `src/data/*` from the world-countries / world-atlas datasets |

### Google sign-in (optional)

Create an OAuth client at https://console.cloud.google.com/apis/credentials with the redirect URI `{APP_URL}/api/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`. The “Continue with Google” button appears automatically.

## Project layout

```
src/
  app/                    Pages (App Router) and API route handlers (app/api/**)
  features/               Feature modules: data hooks + feature components
    auth/ map/ trips/ social/ explore/ profile/ settings/ stats/
  components/             Shared UI (Button, Sheet, Avatar, cards, app shell…)
  lib/                    Client/shared: API client, types, validation (zod), utils
  server/                 Server-only code
    db/                   Drizzle schema, connection, seed data
    auth/                 Password hashing, sessions, Google OAuth
    http/                 Route wrapper (auth, CSRF, rate limits, errors), uploads
    services/             Business logic + authorization (one file per domain)
    storage/              S3 client + image processing (sharp)
  proxy.ts                Redirects signed-out visitors away from app pages
drizzle/                  SQL migrations
scripts/                  db-migrate, db-seed, build-countries
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data model, API, security model and how to extend it.
