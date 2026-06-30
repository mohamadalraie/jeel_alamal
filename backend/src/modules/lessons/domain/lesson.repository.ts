import { LessonCategory } from './lesson-category.entity';
import { Lesson } from './lesson.entity';
import { LessonClassBinding } from './lesson-class-binding.entity';
import { LessonKind } from './lesson-kind';
import { LessonSourceKind } from './lesson-source-kind';

export const LESSON_REPOSITORY = Symbol('LESSON_REPOSITORY');

/** Read model for a source as returned to the program views. */
export interface SourceRead {
  kind: LessonSourceKind;
  url: string;
  description: string | null;
}

/**
 * A program entry as joined for reads (class program / teacher feed). The
 * student projection is derived from this in the use-case (drops sources etc.).
 */
export interface ProgramEntryRead {
  lessonClassId: string;
  lessonId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  category: { id: string; name: string; color: string } | null;
  date: string; // YYYY-MM-DD
  sort: number;
  teacher: { id: string; name: string };
  className: string;
  sources: SourceRead[];
}

export interface LessonRepository {
  // ── Categories ──
  addCategory(category: LessonCategory): Promise<void>;
  listCategories(instituteId: string): Promise<LessonCategory[]>;
  findCategoryById(id: string): Promise<LessonCategory | null>;
  saveCategory(category: LessonCategory): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  // ── Lessons (writes) ──
  /** Create the definition + sources + class bindings in one transaction. */
  createLesson(lesson: Lesson, bindings: LessonClassBinding[]): Promise<void>;
  findLessonById(id: string): Promise<Lesson | null>;
  /** Update shared content (replaces sources). */
  updateLesson(lesson: Lesson): Promise<void>;
  /** Replace the whole binding set for a lesson (add/remove classes, reteach). */
  setBindings(lessonId: string, bindings: LessonClassBinding[]): Promise<void>;
  deleteLesson(id: string): Promise<void>;
  /** Remove the lesson from ONE class (one binding). */
  removeBinding(lessonClassId: string): Promise<void>;
  findBindingById(lessonClassId: string): Promise<LessonClassBinding | null>;
  /** Set the order of a class's entries on a given date. */
  reorderClassDay(classId: string, date: string, orderedLessonClassIds: string[]): Promise<void>;

  // ── Reads ──
  /** All entries of a class (optionally within [from,to]). Newest-first not required. */
  getClassProgram(classId: string, from?: string, to?: string): Promise<ProgramEntryRead[]>;
  /** Past entries (date <= today) of a class — basis for the student view. */
  getClassProgramUpTo(classId: string, today: string): Promise<ProgramEntryRead[]>;
  /** The lessons assigned to a teacher across their classes. */
  getTeacherProgram(teacherId: string): Promise<ProgramEntryRead[]>;
}
