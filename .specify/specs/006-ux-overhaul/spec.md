# Spec 006 — UX Overhaul

**Status:** approved (verbal, 2026-06-13) · **Constitution:** v2.0.0 · frontend-only

## Goals (user-selected)
1. **Feedback**: toast notifications on every create/edit/delete/recite/login
   (replace silent successes + raw `alert()`).
2. **Perceived speed**: loading **skeletons** instead of "loading…" text.
3. **Empty states**: friendly icon + message + primary action.
4. **Search** boxes on the teachers/students/classes lists.
5. **Data layer**: **TanStack React Query** — caching, background refetch,
   no-flicker updates, query invalidation on mutations.
6. **Mobile**: list tables collapse to **stacked cards** on small screens.
7. **Statistics**: charts (recharts) — counts donut + students-per-class bar.
8. **Dark-mode + RTL polish sweep** across every screen.

## Approach
- `QueryProvider` (client) + shadcn **sonner** `<Toaster>` mounted in the locale
  layout (RTL-aware position). A small `toast` helper wraps success/error.
- `lib/queries.ts`: typed hooks (`useInstitutes`, `useTeachers`, `useStudents`,
  `useClasses`, `useClassProfile`, `useStudentProfile`, `useStudentRecitation`,
  `useClassRecitation`, `useStats`, `useSurahs`) + mutation hooks that invalidate
  and toast.
- Shared primitives: `EmptyState`, `SearchInput`, skeleton blocks; the existing
  `DataTable` gains optional `searchable` + renders **cards on mobile**.
- Stats page: keep the 4 cards, add a counts chart + a students-per-class chart
  (computed from the classes list — no new backend endpoint).
- Constitution: reuse primitives, semantic tokens only, both themes + RTL.

## Out of scope
New backend endpoints (this is frontend-only); activity feed needing new data;
the anatomical heart SVG.
