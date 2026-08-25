<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/010-dinars/plan.md` (Dinars — نظام الدنانير).
<!-- SPECKIT END -->

# جيل العمل / Jeel Alamal

Multi-institute learning platform. Monorepo: `frontend/` (Next.js) + `backend/`
(NestJS, Clean Architecture) + PostgreSQL, all via Docker Compose.

**Read and follow `.specify/memory/constitution.md` before writing any code.**
It is the binding standard for architecture, multi-tenancy, RBAC, component
reuse, brand colors/theming, i18n/RTL, and the definition of done.

Quick rules that catch most mistakes:
- Backend: 4 layers per module; domain imports no framework; ORM is **Drizzle**,
  confined to `infrastructure/`; copy the `users` module shape.
- Every tenant-owned query is scoped by `institute_id`; permissions enforced
  server-side, deny by default.
- Frontend: reuse primitives from `src/components/ui/` — never duplicate them;
  semantic color tokens only (no raw hex / `bg-teal-600`); both locales
  (ar RTL default, en) and both themes (light/dark) before done.
- Next.js 16: the middleware convention is renamed — locale routing lives in
  `src/proxy.ts` (exports `proxy`), not `middleware.ts`.
- Schema changes: `npm run db:generate` → review SQL → commit → `npm run migration:run`.
  Never `drizzle-kit push`.
- Features start as specs: `/speckit-specify → /speckit-plan → /speckit-tasks → /speckit-implement`.
