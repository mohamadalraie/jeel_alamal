# جيل العمل — Jeel Alamal

Learning-institute platform. **Mobile-first** web app with an Arabic (RTL) /
English (LTR) bilingual UI.

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · next-intl
- **Backend:** NestJS · TypeScript · Drizzle ORM · PostgreSQL — **Clean Architecture**
- **Infra:** Docker Compose (3 services: `frontend`, `backend`, `db` + Adminer)
- **Process:** GitHub Spec Kit (spec-driven development)

> 📜 **All standards live in the [constitution](.specify/memory/constitution.md)** —
> architecture, multi-tenancy, roles/permissions, component reuse, brand colors,
> theming, and the definition of done. Read it before contributing.

---

## Quick start (Docker — recommended)

```bash
cp .env.example .env        # then edit secrets (JWT_SECRET, db password)
docker compose up --build
```

| Service        | URL                            |
| -------------- | ------------------------------ |
| Frontend       | http://localhost:3000 (→ /ar)  |
| Backend API    | http://localhost:3001/api      |
| Health check   | http://localhost:3001/health   |
| Adminer (DB UI)| http://localhost:8080          |

The backend runs pending migrations automatically on startup, then starts in
watch mode. Editing files in `frontend/` or `backend/` hot-reloads.

### Production

```bash
# Build args bake NEXT_PUBLIC_API_URL into the frontend, so set it first.
NEXT_PUBLIC_API_URL=https://api.example.com \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## Repository layout

```
jeel_alamal/
├── docker-compose.yml / docker-compose.prod.yml
├── .env.example
├── .specify/                 # Spec Kit (constitution, templates, workflows)
├── frontend/                 # Next.js — mobile-first, AR/EN
└── backend/                  # NestJS — Clean Architecture
```

### Backend — Clean Architecture

Each bounded context under `backend/src/modules/<feature>/` has four layers; the
dependency arrows point **inward**:

```
presentation ─▶ application ─▶ domain ◀─ infrastructure (implements ports)
```

- **domain** — entities, value objects, repository *interfaces*. No framework.
- **application** — use-cases, DTOs, ports. Depends only on domain.
- **infrastructure** — Drizzle schemas, repository implementations, adapters.
- **presentation** — HTTP controllers; thin, maps domain errors to HTTP.

The composition root (`<feature>.module.ts`) is the only place ports are bound to
concrete implementations. **`modules/users/`** is the reference module — copy its
shape for new features. Business logic is unit-testable without a database
(`register-user.use-case.spec.ts`).

#### Backend commands (run inside `backend/`)

```bash
npm run start:dev          # watch mode
npm test                   # unit tests
npm run build              # compile to dist/
npm run db:generate        # generate SQL migration from *.schema.ts changes
npm run migration:run      # apply migrations
npm run db:studio          # browse the DB with Drizzle Studio
```

### Frontend — mobile-first & i18n

- Locale routing via the `app/[locale]/` segment (`ar` default, `en`).
- Document direction (`dir`) is derived from the locale (`rtl-detect`).
- Strings live in `frontend/messages/{ar,en}.json`.
- Locale routing handled by `src/proxy.ts` (Next.js 16 renamed `middleware` → `proxy`).
- shadcn/ui components are RTL-safe (logical properties).

---

## Spec-driven development (Spec Kit)

Use these skills with Claude Code, in order:

1. `/speckit-constitution` — project principles (already seeded in
   `.specify/memory/constitution.md`).
2. `/speckit-specify` — write a feature spec.
3. `/speckit-plan` — implementation plan (+ constitution compliance check).
4. `/speckit-tasks` — break the plan into tasks.
5. `/speckit-implement` — execute.

---

## Environment variables

See [`.env.example`](.env.example). Never commit a real `.env`.

| Variable              | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `POSTGRES_*`          | Database name / credentials              |
| `DATABASE_HOST/PORT`  | How the backend reaches Postgres         |
| `JWT_SECRET`          | JWT signing secret (≥16 chars)           |
| `NEXT_PUBLIC_API_URL` | Backend URL the **browser** calls        |
```
