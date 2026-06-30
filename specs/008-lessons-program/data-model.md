# Phase 1 Data Model: Class Lessons Program

Incremental migration **0003** (additive). New enums + 4 tables + 1 column on `classes`. All tenant-owned tables carry `institute_id` (Constitution II). FK cascade rules chosen so deletes stay consistent.

## Enums

- `lesson_kind` = `lesson` | `recitation`
- `lesson_source_kind` = `link` | `image` | `pdf`

## Tables

### `lesson_categories` (tenant-owned)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| institute_id | uuid NOT NULL → institutes(id) ON DELETE CASCADE | tenant scope |
| name | varchar(100) NOT NULL | |
| color | varchar(20) NOT NULL | hex string, user data |
| created_at | timestamptz NOT NULL default now | |

### `lessons` (shared definition, tenant-owned)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| institute_id | uuid NOT NULL → institutes(id) ON DELETE CASCADE | tenant scope |
| kind | lesson_kind NOT NULL default `lesson` | |
| name | varchar(200) NULL | required when kind=lesson; null for recitation |
| description | text NULL | |
| category_id | uuid NULL → lesson_categories(id) ON DELETE SET NULL | uncategorized on category delete |
| date | date NOT NULL | 'YYYY-MM-DD' |
| created_by | uuid NOT NULL → users(id) | author (manager) |
| created_at | timestamptz NOT NULL default now | |

### `lesson_sources` (child of lessons)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| lesson_id | uuid NOT NULL → lessons(id) ON DELETE CASCADE | |
| kind | lesson_source_kind NOT NULL | link \| image \| pdf |
| url | varchar(1000) NOT NULL | external URL or `/uploads/...` path |
| description | varchar(300) NULL | |
| sort | smallint NOT NULL default 0 | display order |

### `lesson_classes` (per-class binding — the "lesson" for a class)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | its OWN id (per-class lesson id) |
| lesson_id | uuid NOT NULL → lessons(id) ON DELETE CASCADE | shared definition |
| class_id | uuid NOT NULL → classes(id) ON DELETE CASCADE | |
| teacher_id | uuid NOT NULL → users(id) | the assigned teacher for this class |
| sort | smallint NOT NULL default 0 | order within the class's day |
| | UNIQUE(lesson_id, class_id) | a lesson maps to a class at most once |

### `classes` (extension)
| Column | Type | Notes |
|---|---|---|
| lessons_visible_to_students | boolean NOT NULL default false | manager-controlled student visibility |

## Relationships

```
institutes 1───* lesson_categories
institutes 1───* lessons
lesson_categories 1───* lessons        (SET NULL on category delete)
lessons 1───* lesson_sources           (CASCADE)
lessons 1───* lesson_classes           (CASCADE)        ← N classes share 1 lesson
classes 1───* lesson_classes           (CASCADE)
users(teacher) 1───* lesson_classes    (assigned teacher)
```

## Domain entities (backend, framework-free)

- **LessonCategory** `{ id, instituteId, name, color, createdAt }`
  - Invariants: `name` non-empty; `color` non-empty (hex).
- **LessonSource** (value object) `{ kind: 'link'|'image'|'pdf', url, description|null, sort }`
  - Invariant: `url` non-empty.
- **Lesson** (aggregate root) `{ id, instituteId, kind, name|null, description|null, categoryId|null, date, sources: LessonSource[], createdBy, createdAt }`
  - Invariants: if `kind=lesson` then `name` required; if `kind=recitation` then `name/description/categoryId` null and `sources` empty; `date` valid 'YYYY-MM-DD'.
- **LessonClassBinding** `{ id, lessonId, classId, teacherId, sort }`
  - Created alongside the Lesson; one per scheduled class.

## Read models (application layer)

- **ProgramEntry** (class program / student / teacher views): `{ lessonClassId, lessonId, kind, name|null, description|null, category: {id,name,color}|null, date, teacher: {id,name}, className?, sources?: SourceView[] }`
  - Student projection omits `sources` and future entries; recitation shows the fixed label.
  - Teacher feed adds `isNext: boolean`.
- **SourceView**: `{ kind, url, description|null }` (url already resolvable to an asset).

## Validation rules (from requirements)

- FR-004/009: lesson requires name (kind=lesson); recitation forbids name/desc/category/sources.
- FR-005: each source is exactly one kind with a non-empty url.
- FR-010/011/013: ≥1 class; each selected class has a teacher; all classes + teachers belong to the lesson's institute.
- FR-012: editing shared content updates the single `lessons` row; per-class removal deletes only that `lesson_classes` row.
- FR-017/018/019: student view gated by `lessons_visible_to_students` AND `date <= today`, projecting name+description only.
- FR-020/021/022: manager-only mutations; teacher/student reads actor-scoped; all institute-scoped, deny by default.
