# جيل العمل / Jeel Alamal Constitution

Non-negotiable rules for the Jeel Alamal multi-institute learning platform. Every
specification, plan, task, and line of code MUST comply. `/speckit-plan` checks
compliance against this document. Amend only via `/speckit-constitution` with a
version bump.

---

## Core Principles

### I. Clean Architecture & Dependency Rule (NON-NEGOTIABLE)

Backend code is organised into four layers per bounded context under
`backend/src/modules/<feature>/`:

```
presentation ─▶ application ─▶ domain ◀─ infrastructure (implements ports)
```

- **domain** — entities, value objects, repository *interfaces* (ports). Imports
  NO framework: no Nest, no Drizzle, no HTTP.
- **application** — use-cases, DTOs, ports. Depends only on domain.
- **infrastructure** — Drizzle schemas, repository implementations, adapters.
  The ONLY layer that touches the ORM or external services.
- **presentation** — thin HTTP controllers; map domain errors to HTTP.

Ports are bound to implementations ONLY in the feature's `*.module.ts`
(composition root). The `users` module is the reference implementation — new
modules copy its shape. Business logic must be unit-testable with in-memory
fakes, no database.

### II. Multi-Tenancy & Data Isolation (NON-NEGOTIABLE)

The platform serves **multiple institutes**. Tenant isolation is a security
boundary, not a feature:

- Every tenant-owned table carries an `institute_id` column (FK to `institutes`).
- Every query, mutation, and permission check is scoped to the actor's
  institute. Use-cases receive an **actor context** (user id, role,
  institute id) and must apply tenant filtering in the application layer —
  never trust the client to send the right institute id.
- Cross-institute access is reserved for `super_admin` only.
- A use-case that touches tenant data without institute scoping is a bug,
  even if it "works". Tenant-isolation behaviour must be covered by tests.

### III. Roles & Permissions (RBAC) (NON-NEGOTIABLE)

Canonical roles (extensible — more roles will be added):

| Role | Arabic | Cardinality | Scope |
| --- | --- | --- | --- |
| `super_admin` | المشرف العام | exactly **one** | global, cross-institute |
| `institute_manager` | مدير المعهد | many | their institute: manages teachers, students, statistics |
| `teacher` | أستاذ | many | their institute: creates students, gives lessons |
| `student` | طالب | many | their institute: own data only |

Rules:
- Enforcement is **server-side**: every non-public endpoint declares its
  required permission via guards/decorators. Deny by default.
- Authorisation checks live in the application layer (use-case receives the
  actor context); controllers only extract the actor from the request.
- Prefer **permission checks** (`can('manage-students')`) over hard-coded role
  string comparisons, so new roles slot in without rewriting checks.
- The frontend hides UI the actor can't use — that is UX only, never security.

### IV. Authentication & Security

- **JWT**: short-lived access token (~15 min) + refresh token with rotation
  (~7 days), delivered as `httpOnly` `Secure` `SameSite` cookies — never stored
  in `localStorage`.
- Passwords hashed through the `PasswordHasher` port (bcrypt adapter today; the
  algorithm is swappable without touching use-cases).
- `helmet` on; CORS restricted to the frontend origin; rate limiting on; global
  `ValidationPipe` whitelists DTO fields and rejects unknown ones.
- Secrets only via validated environment variables; the app fails fast on
  missing/invalid config. `.env` never enters git.

### V. Component Reuse (NON-NEGOTIABLE)

- UI primitives (buttons, inputs, fields, tables, dialogs, cards, badges,
  selects…) live in **one place**: `frontend/src/components/ui/` (shadcn/ui).
- Before building ANY interface element: search the existing components first.
  If a similar one exists, **extend it** with a variant (`cva`) or composition —
  never copy-paste or fork it.
- One shared `DataTable`, one `FormField` wrapper, one `Button`. Feature
  components under `src/features/` only **compose** primitives; they never
  re-implement them.
- A PR that introduces a duplicate of an existing primitive must be rejected.

### VI. Brand Identity & Theming

The palette is derived from the official logo (Kufic calligraphy — gold + deep
navy) and is the project standard:

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Gold (primary) | `#BE9B5F` | `#C9A86C` | primary actions, highlights, focus rings |
| Deep navy (secondary) | `#123B50` | `#17435C` | headings, secondary elements, sidebar |
| Ivory (background) | `#FAF6EF` | — | warm light-mode surfaces (cards stay white) |
| Navy-black (background) | — | `#081A24` | dark-mode surfaces |

Rules:
- Components use **semantic tokens only** (`bg-primary`, `text-muted-foreground`,
  CSS variables in `globals.css`). Raw hex values and arbitrary Tailwind palette
  classes (`bg-teal-600`, `text-gray-500`) are forbidden in components.
  Exception: semantic status colors (success/warning/destructive) via their own
  tokens.
- **Light AND dark mode are mandatory** for every screen. A feature is not done
  until it renders correctly in both.
- Aesthetic: **luxury through restraint** — generous whitespace, gold used
  sparingly as an accent (never large gold surfaces), consistent radius scale,
  subtle elevation, no visual noise.

### VII. Mobile-First, Bilingual, RTL by Default

- Primary target is **mobile**: design every screen at a small viewport first,
  then enhance upward.
- Arabic (`ar`, RTL) is the default locale; English (`en`, LTR) secondary. The
  document `dir` derives from the locale.
- ALL user-facing strings live in `frontend/messages/{locale}.json` — never
  hard-coded. Use Tailwind logical properties (`ps-*`, `pe-*`, `start-*`) so
  layouts mirror correctly. A feature is not done until both locales render
  correctly.

### VIII. Schema via Drizzle Migrations, Validated Config

- The ORM is **Drizzle**. Table definitions live in the owning module's
  infrastructure layer (`*.schema.ts`).
- The database schema is owned by generated SQL migrations:
  `npm run db:generate` → review the SQL → commit it → `npm run migration:run`.
- `drizzle-kit push` is forbidden outside throwaway local experiments.
- Environment variables are validated at startup (`env.validation.ts`).

### IX. Containerised, Reproducible Environments

Three services (`frontend`, `backend`, `db`) via Docker Compose. Dev uses
hot-reload bind mounts; production uses multi-stage, slim, non-root images.
"Works on my machine" is not acceptable — it must work in the containers.

### X. Spec-Driven Development

Non-trivial features start from a spec:
`/speckit-specify → /speckit-plan → /speckit-tasks → /speckit-implement`.
Specs describe behaviour and acceptance criteria before code. Plans include a
compliance check against this constitution.

---

## Clean Code Rules

### TypeScript
- `strict` mode everywhere. `any` is forbidden (justify rare exceptions in a
  comment). No `@ts-ignore` / `@ts-expect-error` without a linked reason.
- Prefer `import type` for type-only imports (required for DI tokens + TS1272).

### Naming
| Thing | Convention | Example |
| --- | --- | --- |
| Files | kebab-case + role suffix | `register-user.use-case.ts`, `email.vo.ts` |
| Drizzle tables | `*.schema.ts` | `user.schema.ts` |
| Repo ports / impls | `*.repository.ts` / `drizzle-*.repository.ts` | `user.repository.ts` |
| Tests | `*.spec.ts` next to the unit | `register-user.use-case.spec.ts` |
| Classes/Components | PascalCase | `RegisterUserUseCase`, `LocaleSwitcher` |
| Functions | camelCase verbs | `findByEmail` |
| Booleans | `is/has/can` prefix | `isActive`, `canManageStudents` |
| Constants / DI tokens | UPPER_SNAKE / `Symbol` | `USER_REPOSITORY` |
| DB columns | snake_case | `password_hash`, `institute_id` |

### Functions & Structure
- Small functions, one purpose. Early returns over nested conditionals.
- Max ~3 positional parameters — use an options object beyond that.
- No magic numbers/strings: named constants or config.
- DRY with judgment (rule of three) — but UI primitives follow Principle V
  strictly: reuse always.

### Errors
- Domain/application throw framework-free domain errors
  (`BusinessRuleError`, `NotFoundError`, `ConflictError` in `shared/domain`).
- Controllers translate them to HTTP; the global filter produces the standard
  envelope `{ success, statusCode, message, timestamp, path }`.
- Never swallow errors. Never leak internals (stack traces, SQL) to clients.

### Comments & Hygiene
- Comments explain **why**, not what. No commented-out/dead code in commits.
- Validation at every boundary: DTOs + ValidationPipe on the API; zod/form
  validation on the frontend.
- `async/await` over `.then()` chains; no floating promises.

### Git
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.
- Branches: `feature/<short-name>`, `fix/<short-name>`.
- Small, reviewable changes; one concern per commit.

---

## Technology Constraints

| Area | Standard |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui, next-intl |
| Backend | NestJS, TypeScript, Clean Architecture layers |
| ORM / DB | **Drizzle** + PostgreSQL, migrations via drizzle-kit |
| Auth | JWT access + refresh rotation, httpOnly cookies, hashing port |
| Theming | CSS-variable design tokens, `.dark` class strategy, light + dark |
| i18n | next-intl, `ar` (RTL, default) + `en` (LTR) |
| Infra | Docker Compose, 3 services, multi-stage prod images |
| Process | GitHub Spec Kit |

---

## Quality Gates — Definition of Done

A change is done only when ALL hold:

1. `npm run build` passes in both apps; lint passes.
2. New/changed use-cases have unit tests with in-memory fakes; tests pass.
3. Endpoints enforce permissions server-side and tenant scoping (Principles II–III).
4. UI renders correctly in **both locales** (ar RTL / en LTR) and **both themes**.
5. UI verified at a mobile viewport first.
6. No raw colors; only semantic tokens. No duplicated primitives.
7. Schema changes shipped as reviewed, committed Drizzle migrations.
8. The relevant spec under `.specify/` is updated if behaviour changed.

---

## Governance

This constitution supersedes ad-hoc conventions. Deviations must be justified in
writing in the relevant spec and approved. Amendments go through
`/speckit-constitution` and bump the version (MAJOR for principle changes,
MINOR for additions, PATCH for clarifications).

**Version**: 2.0.0 | **Ratified**: 2026-06-11 | **Last Amended**: 2026-06-11
