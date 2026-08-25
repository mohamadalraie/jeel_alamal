# Quickstart — Dinars (نظام الدنانير) validation guide

End-to-end scenarios proving the feature. Assumes the stack runs via Docker Compose
and the migration `0005_dinars.sql` is applied. Uses an existing institute with a
manager, a teacher, a class the teacher teaches, and ≥ 3 enrolled students.

## Prerequisites

```bash
# from repo root
docker compose up -d                     # db + backend + frontend
docker compose exec backend npm run migration:run   # apply through 0005
```

Reference: entities in [data-model.md](data-model.md), endpoints in
[contracts/dinars-api.md](contracts/dinars-api.md).

## Backend unit tests (fakes, no DB)

```bash
docker compose exec backend npm test -- dinars
```
Expected: reconciliation (attendance replace/remove, idempotent re-run), snapshot
(rule edit doesn't change history), reversal (once only; automatic not reversible),
and RBAC/tenant scoping specs pass.

## Scenario 1 — Manager configures rules (US1)

1. Sign in as manager → **Dashboard → Dinars → Settings**.
2. See 9 system rules pre-listed (attendance ×4, recitation ×5), all `0` / inactive.
3. Set `attendance.present = +2`, `attendance.absent = −8`, activate both.
4. Set `recitation.excellent = +10`, activate.
5. Create a manual lesson rule "مشاركة مميزة" `+5` and "شغب" `−10`.
- ✅ Manual rules appear for teachers; system rules now fire on events.
- ✅ Deleting "مشاركة مميزة" after it has history → blocked (deactivate offered).
- ✅ Deleting any system rule → blocked.

## Scenario 2 — Teacher awards during a lesson, single + bulk (US2)

1. Sign in as teacher → start a lesson (timer page) for the class.
2. **Award dinars** → pick "مشاركة مميزة" (+5) for one student → confirm.
   - ✅ Student balance +5; entry shows teacher name, context `lesson`.
3. **Award dinars** → select 3 students → "مشاركة مميزة" → confirm.
   - ✅ Each of the 3 gets a separate +5 entry.
4. **Award dinars** → Exceptional → `−6`, reason "إتلاف أداة" → confirm.
   - ✅ Balance −6, reason stored. Empty reason → rejected.
5. From a student **not** in the teacher's class (via API) → 403.
6. Reverse the exceptional entry → compensating entry appears; net restored; original
   still visible; second reverse → 409.

## Scenario 3 — Automatic dinars from attendance & recitation (US3)

1. As teacher, take attendance: mark student A **absent**.
   - ✅ A receives one −8 entry (`source_ref = classId:date`).
2. Re-take attendance for the same day: change A to **present**.
   - ✅ A's −8 is **replaced** by +2 (no leftover −8, no reversal row).
3. Re-save the same attendance unchanged.
   - ✅ No duplicate entry (idempotent).
4. Deactivate `attendance.absent`, mark student B absent.
   - ✅ No dinar entry for B.
5. Log an **excellent** recitation for A.
   - ✅ A receives +10 (`source_ref = recitationId`).

## Scenario 4 — Student view (US4)

1. Sign in as student A → **Dinars** tab.
   - ✅ Net balance, positive total, negative total, and full newest-first ledger.
   - ✅ Negative net renders clearly negative.
2. Student A requests student B's dinars (via API) → 403.
3. A student with no entries → balance 0 + empty state.

## Scenario 5 — Leaderboard (US5)

1. As teacher → **Dinars → Leaderboard** (class scope) → ranked desc, ties share rank.
2. As manager → institute-wide leaderboard renders across classes.
3. Teacher requests institute-wide or a non-taught class (via API) → 403.

## Definition-of-done checks

```bash
docker compose exec backend npm run build && docker compose exec backend npm run lint
docker compose exec frontend npm run build && docker compose exec frontend npm run lint
```
Manual UI: verify every new screen in **ar (RTL)** and **en (LTR)**, **light + dark**,
at a **mobile** viewport; amounts use `DinarBadge` (success/destructive tokens, `<bdi>`).
