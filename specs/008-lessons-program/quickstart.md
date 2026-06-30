# Quickstart / Validation: Class Lessons Program

End-to-end validation of the feature against the live stack. Follows the project's no-wipe rule (never `docker compose down -v`); uses unique-suffixed test data.

## Prerequisites

- Containers up: `docker compose ps` shows `db` healthy, `backend` and `frontend` up.
- Migration applied: `0003_*` present in `backend/drizzle/` and run via `npm run migration:run` (inside the backend container). Confirm tables exist: `lesson_categories, lessons, lesson_sources, lesson_classes` and column `classes.lessons_visible_to_students`.
- A manager login for an institute with ≥2 classes and ≥2 teachers (use the existing seeded data).

## Scenario A — Manager builds a class program (US1, US4)

1. Log in as a manager; open a class → **Lessons** tab.
2. Add a category "فقه" (color) via the category manager.
3. Add a lesson: name, description, category=فقه, date=today, one link source ("درس مرئي").
4. Add a second lesson on the same date; reorder so it appears first.
5. Edit the first lesson's name; delete the second.
- **Expected**: category appears and colors the lesson; both lessons show on today; reorder persists; edit/delete reflected immediately. Both locales + dark mode render correctly.

## Scenario B — One lesson for multiple classes, teacher per class (US2)

1. Add a lesson; in the schedule step select **two** classes; assign teacher A to class 1 and teacher B to class 2.
2. Open class 1 and class 2 programs.
3. Edit the shared lesson name once.
- **Expected**: both classes show the lesson on the date with their own teacher; after the single edit, both classes reflect the new name (no duplicate/divergent data). Removing it from class 1 leaves it in class 2.

## Scenario C — Recitation entry (US5)

1. Add an entry, choose type **تسميع القرآن**, pick a class + teacher + date. No name/sources fields are required.
- **Expected**: the entry shows as "تسميع القرآن الكريم" with no name/category/sources; the assigned teacher sees it in their lessons.

## Scenario D — Teacher view (US3)

1. Log in as teacher A.
2. Open **دروسي / My Lessons**.
- **Expected**: teacher A's assigned lessons appear sorted by date, the nearest upcoming one highlighted; opening it shows class, category, description, date, sources. Empty state when none.

## Scenario E — Student gated past view (US6)

1. As manager, on a class set **student visibility = ON**.
2. Ensure the class has one past lesson and one future lesson.
3. Log in as a student of that class → portal **Lessons** tab.
- **Expected**: only the past lesson shows, name+description only, no sources, no future lesson. Set visibility OFF → student sees nothing.

## Scenario F — Tenant & permission safety

- A teacher cannot create/edit lessons or categories (read-only); a student cannot access another class's program; selecting a class/teacher from another institute is rejected.

## Automated check

Run `bash scripts/verify-lessons.sh` (to be created in tasks): logs in via the API, creates a category + a multi-class lesson + a recitation entry with unique suffixes, asserts the class program, the teacher feed (`/api/lessons/mine`), the student gated view (toggled on/off), and tenant rejection — all against the live DB without wiping.

## Definition of done (per constitution)

- 4-layer module; tenant-scoped; manager/teacher/student permissions enforced server-side.
- Incremental migration `0003` committed; no `drizzle-kit push`; no `down -v`.
- Frontend composes existing `components/ui`; both **ar/RTL + en** and **light + dark** verified; mobile-first.
- All strings in `messages/{ar,en}.json`.
