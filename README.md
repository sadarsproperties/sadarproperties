# Sadar Properties

Real estate wholesaling toolkit for Sadar Properties.

## Architecture

| Layer | Tech | Location |
|-------|------|----------|
| **Frontend** | React + Vite + Tailwind | `dashboard/` |
| **Backend** | Express + PostgreSQL | `server/` |
| **Database** | PostgreSQL | `DATABASE_URL` (or PG* env vars) |

**Note**: The project was migrated from SQLite to PostgreSQL for better scalability and production readiness.

The first version used browser localStorage only. It now has a real backend API that persists data to PostgreSQL.

## Quick Start

Install dependencies once:

```bash
npm run setup
```

Start **backend + frontend together** with one command:

```bash
npm start
```

(`npm run dev` does the same thing.)

- API: http://localhost:3001
- Dashboard: http://localhost:5173

To run them separately:

```bash
npm run server      # backend only
npm run dashboard   # frontend only
```

**Authentication is now required.** On first visit you’ll be taken to a beautiful login / signup screen with:
- Email + password
- One-click **Google** and **Facebook** social login (OAuth 2.0)

### Social Login Setup (optional but awesome)

1. Copy `.env.example` → `.env`
2. For Google: create OAuth 2.0 credentials at Google Cloud Console and add the callback URL.
3. For Facebook: create a Facebook App and enable Facebook Login, add the callback.

If social keys are missing, the buttons show a friendly message and you can still use email/password.

On first launch after login, click **Load Sample Data** on the dashboard to seed sellers, buyers, investors, and properties.

### Database (PostgreSQL)

You must have a running PostgreSQL server.

1. Create a database (example):
   ```sql
   CREATE DATABASE sadarproperties;
   ```

2. Set the connection in `.env` (copy from `.env.example`):
   ```env
   DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/sadarproperties
   # For Supabase (pooler recommended):
   # DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

3. (Optional but recommended) Migrate data from the old SQLite database:
   ```bash
   npm run db:migrate:sqlite
   # Add --force to clear the Postgres tables first
   ```

4. The tables are created automatically on server start via `initDb()`.

The app will work with any Postgres provider (Neon, Supabase, Railway, local Docker, etc.) by just changing the `DATABASE_URL`.

## Dashboard Features

1. Property type + lead category filters
2. Price brackets + urgency toggles (<$10k in 4hrs, new in 24hrs)
3. Sellers, Buyers, Investors directories (inline editable)
4. Deal math: MAO, offer range, assignment fee, deal score
5. Buyer/investor matching by buy box on each property
6. CSV import + Excel/CSV export

## API Endpoints

```
GET    /api/health
GET    /api/data
POST   /api/seed
GET/POST/PUT/DELETE  /api/properties
GET/POST/PUT/DELETE  /api/sellers
GET/POST/PUT/DELETE  /api/buyers
GET/POST/PUT/DELETE  /api/investors
POST   /api/{resource}/bulk   # CSV import
```

## Scrapers (optional)

Manual CSV upload is the primary workflow. Scrapers remain available:

```bash
npm run scrape -- zillow "https://www.zillow.com/homes/for_sale/New-York,-NY/"
```