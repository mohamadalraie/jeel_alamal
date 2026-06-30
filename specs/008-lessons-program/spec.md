# Feature Specification: Class Lessons Program (الدروس)

**Feature Branch**: `008-lessons-program`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Each class has a lessons program (dated lessons on a calendar, manual order per day), dynamic per-institute categories with name+color, a special 'تسميع القرآن الكريم' entry, lessons with sources (link/image/pdf + description), multi-class scheduling without duplication (per-class teacher), a teacher 'my lessons / next lesson' view, and a manager-controlled toggle that lets students see only past lessons' name+description."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manager builds a class's dated lessons program (Priority: P1)

A manager opens a class's "Lessons" tab and sees a weekly, date-based program. For a chosen day they add a lesson by entering a name, an optional description, picking a category, and (optionally) attaching one or more sources (a link, an image, or a PDF — each with its own description). The lesson is saved on that date and appears in the day's list. Multiple lessons can sit on the same day, ordered manually.

**Why this priority**: This is the core of the feature — without the ability to create and view a class's dated program, nothing else has value. It is the MVP.

**Independent Test**: Create a class, open its Lessons tab, add two lessons with categories on the same date, reorder them, edit one, delete the other — and confirm the program reflects each change on the correct date.

**Acceptance Scenarios**:

1. **Given** a manager viewing a class's Lessons tab on a given week, **When** they add a lesson with a name, category, and date, **Then** the lesson appears under that date in the program.
2. **Given** a day that already has one lesson, **When** the manager adds a second lesson to the same day, **Then** both appear under that date in the manager-defined order.
3. **Given** an existing lesson, **When** the manager edits its name/description/category or deletes it, **Then** the program updates accordingly.
4. **Given** a lesson with sources, **When** the manager opens the lesson, **Then** each source (link/image/pdf) is shown with its description and is openable.

---

### User Story 2 - Manager schedules one lesson for multiple classes with a teacher per class (Priority: P1)

When adding a lesson, the manager can select one OR several classes at once and choose, for each selected class, which teacher will give that lesson. The shared lesson content (name, description, category, date, sources) is entered once; each class receives its own entry bound to its chosen teacher. Editing the shared content later updates it for every class it was scheduled to, without duplicated data.

**Why this priority**: A primary stated requirement; institutes routinely run the same lesson across several حلقات. Avoiding duplicate data keeps editing consistent and is explicitly required.

**Independent Test**: Schedule one lesson for two classes, assigning a different teacher to each; confirm both classes show the lesson on the date with their respective teacher; edit the shared name once and confirm both classes reflect the change.

**Acceptance Scenarios**:

1. **Given** the add-lesson flow, **When** the manager selects two classes and assigns teacher A to the first and teacher B to the second, **Then** each class's program shows the lesson on that date with its assigned teacher.
2. **Given** a lesson scheduled to multiple classes, **When** the manager edits the shared name or description, **Then** every class's copy reflects the edit (no divergence, no duplication).
3. **Given** a lesson scheduled to multiple classes, **When** the manager removes it from one class, **Then** it disappears from that class only and remains for the others.

---

### User Story 3 - Teacher sees their lessons and their next lesson (Priority: P1)

A teacher logs in and can immediately see the lessons assigned to them across all their classes, with the next upcoming lesson highlighted and its details (name, description, class, category, date, sources) easy to open.

**Why this priority**: The teacher-facing payoff of the program; the requirement explicitly calls out "see easily his lessons and his next lesson details." Delivers value independently of student visibility.

**Independent Test**: Assign two future lessons to a teacher across two classes; log in as that teacher and confirm both appear, sorted by date, with the nearest one highlighted and fully detailed.

**Acceptance Scenarios**:

1. **Given** a teacher with assigned lessons, **When** they open their lessons view, **Then** they see their lessons grouped/sorted by date with the next upcoming lesson highlighted.
2. **Given** the highlighted next lesson, **When** the teacher opens it, **Then** they see its full details including class, category, description, and sources.
3. **Given** a teacher with no upcoming lessons, **When** they open their lessons view, **Then** they see a clear empty state.

---

### User Story 4 - Manager manages dynamic lesson categories (Priority: P2)

A manager can create categories (each with a name and a color) and remove them. Categories are shared across the institute's classes and are used to label and color lessons in every class's program.

**Why this priority**: Categories give the program its visual structure (colored blocks) and are required to be dynamic, but the program can ship with a starter set, so this can follow the core.

**Independent Test**: Add a category with a color, use it on a lesson, then add and remove another category; confirm lessons display the category color and that removing a category leaves existing lessons intact (uncategorized).

**Acceptance Scenarios**:

1. **Given** the category manager, **When** a manager adds a category with a name and color, **Then** it becomes selectable when creating/editing lessons across the institute.
2. **Given** a category in use, **When** the manager deletes it, **Then** lessons that used it remain but show as having no category.
3. **Given** a lesson with a category, **When** it is displayed anywhere in the program, **Then** it shows the category's name and color.

---

### User Story 5 - Manager schedules a Quran-recitation entry (Priority: P2)

For a given day and class(es), instead of a full lesson the manager can add a "تسميع القرآن الكريم" entry. It requires no name, description, category, or sources — only the class(es), date, and the teacher per class. It appears in the program as a distinct recitation entry.

**Why this priority**: A specific, lightweight case the user called out; distinct from a normal lesson and trivially expressible once lessons exist.

**Independent Test**: Add a recitation entry for a class on a date with a teacher; confirm it appears labeled "تسميع القرآن الكريم" with no name/sources fields, and a teacher assigned to it sees it among their lessons.

**Acceptance Scenarios**:

1. **Given** the add-entry flow, **When** the manager chooses the recitation type and selects class(es), date, and per-class teacher, **Then** a recitation entry appears in each class's program for that date.
2. **Given** a recitation entry, **When** it is displayed, **Then** it shows as "تسميع القرآن الكريم" without name, description, category, or sources.

---

### User Story 6 - Students see past lessons when the manager allows it (Priority: P3)

Each class has a manager-controlled toggle for student visibility. By default it is off and students see nothing of the program. When a manager turns it on, the class's students can see ONLY past lessons (date on or before today), and only their name and description — never future lessons and never sources. Recitation entries appear simply as "تسميع القرآن الكريم".

**Why this priority**: A nice-to-have that depends on the program existing; valuable but not required for the manager/teacher core loop.

**Independent Test**: With the toggle off, confirm a student sees no program. Turn it on; confirm the student sees only past lessons' names/descriptions, no future lessons, and no source links/files.

**Acceptance Scenarios**:

1. **Given** a class with student visibility OFF, **When** a student opens their portal, **Then** they see no lessons program (or a disabled/empty state).
2. **Given** a class with student visibility ON, **When** a student opens their program, **Then** they see only lessons dated today or earlier, showing name and description only.
3. **Given** student visibility ON, **When** a student views a past lesson, **Then** no sources are shown and no future lessons are listed.
4. **Given** a past recitation entry with visibility ON, **When** a student views the program, **Then** it appears as "تسميع القرآن الكريم".

---

### Edge Cases

- **Deleting a shared lesson**: Removing the underlying lesson removes it from every class it was scheduled to (and its sources); removing it from a single class leaves the others and the shared content intact.
- **Removing a teacher/class** that has assigned lessons: those per-class entries are removed with the class/teacher detachment; the shared lesson definition survives if still used by another class.
- **Category deletion while in use**: existing lessons keep their data but become uncategorized (no broken references).
- **Recitation entry**: must never require or display name/description/category/sources.
- **Student visibility boundary**: a lesson dated exactly today counts as "past" (visible); a lesson dated tomorrow is hidden; toggling visibility off immediately hides the program again.
- **Multi-class teacher choice**: each selected class must have a teacher chosen; a class with no chosen teacher cannot be scheduled.
- **Cross-tenant safety**: a lesson, its categories, classes, and assigned teachers must all belong to the same institute; selecting a class or teacher from another institute is rejected.
- **Source upload limits**: oversized or disallowed file types for image/pdf sources are rejected with a clear message.

## Requirements *(mandatory)*

### Functional Requirements

#### Categories
- **FR-001**: A manager MUST be able to create a lesson category with a name and a color, scoped to their institute and shared across all its classes.
- **FR-002**: A manager MUST be able to delete a lesson category; lessons that referenced it MUST remain and become uncategorized.
- **FR-003**: The system MUST list an institute's categories for selection when creating or editing lessons.

#### Lessons & program
- **FR-004**: A manager MUST be able to add a lesson to a class on a specific date with a name, optional description, optional category, and zero or more sources.
- **FR-005**: A lesson MUST support multiple sources, where each source is exactly one of: an external link, an uploaded image, or an uploaded PDF — each with an optional description.
- **FR-006**: The system MUST allow multiple lessons on the same date for a class and MUST preserve a manager-defined order among them within that day.
- **FR-007**: A manager MUST be able to edit a lesson's shared details (name, description, category, date, sources) and to delete a lesson.
- **FR-008**: The system MUST present a class's program as dated entries navigable by week, grouped by day.
- **FR-009**: A manager MUST be able to add a "تسميع القرآن الكريم" recitation entry that carries no name, description, category, or sources — only class(es), date, and per-class teacher — and is displayed as a distinct recitation entry.

#### Multi-class scheduling (no duplication)
- **FR-010**: A manager MUST be able to schedule one lesson (or recitation entry) for one or more classes at once.
- **FR-011**: For each selected class, the manager MUST choose the teacher who will give that lesson to that class; different classes MAY have different teachers.
- **FR-012**: The shared lesson content MUST be stored once and referenced by each class binding; editing the shared content MUST update it for every class without duplicating the content, and each class binding MUST be independently identifiable and removable.
- **FR-013**: A lesson's classes and assigned teachers MUST all belong to the same institute as the lesson (tenant isolation).

#### Teacher experience
- **FR-014**: A teacher MUST be able to see the lessons assigned to them across all their classes, sorted by date, with the next upcoming lesson highlighted.
- **FR-015**: A teacher MUST be able to open any of their assigned lessons and see its full details (class, category, name, description, date, sources).
- **FR-016**: A teacher's access to lessons MUST be read-only.

#### Visibility & permissions
- **FR-017**: Each class MUST have a manager-controlled toggle governing whether its students may see the program; it MUST default to off.
- **FR-018**: When a class's toggle is on, a student of that class MUST be able to see ONLY lessons dated today or earlier, showing only name and description (and the label "تسميع القرآن الكريم" for recitation entries).
- **FR-019**: Students MUST NOT see future lessons or any sources, regardless of the toggle.
- **FR-020**: Only managers MUST be able to create/edit/delete lessons and categories and to change the per-class student-visibility toggle.
- **FR-021**: By default (toggle off), only the assigned teacher and the institute's managers MUST be able to see a class's program.
- **FR-022**: All actions MUST enforce institute-scoped access (deny by default) consistent with the platform's multi-tenant rules.

### Key Entities *(include if feature involves data)*

- **Lesson Category**: A named, colored label belonging to an institute; shared across its classes; referenced by lessons.
- **Lesson (definition)**: The shared content of a program entry belonging to an institute: a kind (normal lesson or Quran recitation), a date, and — for normal lessons — a name, optional description, optional category, and a set of sources. Stored once regardless of how many classes use it.
- **Lesson Source**: An attachment/reference on a lesson — a link, an image, or a PDF — each with an optional description and an order.
- **Lesson–Class Binding**: The per-class assignment of a lesson: its own identity, the class it applies to, the teacher assigned for that class, and the order within that class's day. Many bindings can reference one Lesson definition.
- **Class (extension)**: Gains a "students may view the program" flag controlled by managers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can add a lesson to a single class (name + category + date) in under 30 seconds and see it appear in the program immediately.
- **SC-002**: A manager can schedule one lesson for 3 classes with a different teacher each, entering the shared content only once (no re-entry of name/description/sources).
- **SC-003**: Editing a multi-class lesson's shared name once updates all 3 classes' programs, verified by viewing each class.
- **SC-004**: A teacher logging in can identify their next lesson and open its full details within 2 taps/clicks.
- **SC-005**: With student visibility on, 100% of items a student sees are past-dated and show no sources and no future entries; with it off, the student sees none.
- **SC-006**: Deleting a category leaves 100% of previously categorized lessons intact (now uncategorized) with no errors.
- **SC-007**: The program, add/edit flows, and teacher/student views are usable on a mobile screen width and render correctly in both Arabic (RTL) and English and in light and dark themes.

## Assumptions

- The program uses **specific dates** (calendar), not a recurring weekly template; the weekly view is a presentation of dated entries.
- Lessons have **no clock time**; ordering within a day is manual.
- "تسميع القرآن الكريم" is a **distinct entry kind**, not a category, and is independent of the existing Quran-recitation (تسميع) tracking feature.
- Categories, lessons, classes, and teachers are all **institute-scoped**; managers act within their assigned institute(s); the super admin has platform-wide access consistent with existing behavior.
- A lesson's assigned "teacher" may be any staff member eligible to teach a class in the institute (a teacher, or a manager who teaches), consistent with the existing class-teacher rules.
- **Sources** support external links plus uploaded images and PDFs; uploaded files are stored via the platform's existing file-upload mechanism and served back for viewing/download; reasonable type/size limits apply.
- Students never create or edit anything here; their access is the read-only, past-only view gated by the per-class toggle.
- Existing modules are reused: classes/حلقات, users/roles, institutes & access policy, and file uploads.
- "Past" for student visibility means date ≤ today (today inclusive).
