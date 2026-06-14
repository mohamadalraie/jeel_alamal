# Spec 005 — Quran Recitation (تسميع القرآن)

**Status:** approved (verbal, 2026-06-13) · **Constitution:** v2.0.0
**Builds on:** specs 001–004

## Confirmed decisions
- Heart map rendered as a **grid of 114 surah tiles** (in order, colored).
- A surah's color uses its **latest** recitation's rating.

## Concept
Every student accumulates Quran-recitation progress. Teachers log recitations;
the system shows each student's history and a colored map of all 114 surahs.

## Recitation entry
Logged by institute staff (teacher/manager/super_admin) from a dialog:
- **Surah** — searchable dropdown of all 114 surahs.
- **From/To ayah** — defaults to the whole surah (from = 1, to = the surah's
  real ayah count). Each surah's ayah count is stored correctly; range is
  validated `1 ≤ from ≤ to ≤ ayahCount`.
- **Rating** — ضعيف → ممتاز (weak, acceptable, good, very_good, excellent).
- Records the author (who logged it) and timestamp.

## Student profile — "تسميع القرآن" tab
- **Summary**: last recitation (surah/range/rating/by/date), number of surahs
  fully recited, number in progress.
- **Heart map**: 114 surah tiles colored by status:
  - **white** — never recited
  - **yellow** — partially recited (some ayahs, not the whole surah)
  - **red → light-pink gradient** — fully recited, by latest rating
    (excellent = red … weak = light pink)
- **Recite** button → the dialog above (student preset).
- **Log**: full recitation history, newest first.

## Class profile — "التسميع" tab
- Recitation log for **all students of the class**.
- **Recite** button → same dialog, with a student picker (class students).

## Permissions
Add + view recitations: institute staff (super_admin, assigned manager, teacher
of the institute). Students have no portal yet, so no student-facing view.

## Data model (incremental migration 0001)
```
recitation_rating  enum(excellent, very_good, good, acceptable, weak)
recitations  id, institute_id→institutes, student_id→users(cascade),
             surah_number smallint (1..114), from_ayah smallint, to_ayah smallint,
             rating recitation_rating, recited_by→users, created_at
```
Surah reference (number, name, ayah_count) is a backend constant (114 entries,
Hafs counts), exposed at `GET /api/quran/surahs`.

## Heart aggregation (per surah, per student)
- gather the student's recitations for the surah; merge covered ayah intervals.
- **full** if the merged interval covers `[1, ayahCount]`; **partial** if some
  coverage; **none** otherwise. Color rating = the latest recitation's rating.

## Out of scope (later)
Student self-view, revision scheduling/spaced-repetition, per-ayah mistakes,
exact anatomical heart SVG (swap-in later without logic changes).
