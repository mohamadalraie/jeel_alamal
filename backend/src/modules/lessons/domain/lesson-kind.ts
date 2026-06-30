/** A program entry is a normal lesson or a Quran-recitation marker (spec 008). */
export enum LessonKind {
  Lesson = 'lesson',
  Recitation = 'recitation',
}

export const LESSON_KINDS = Object.values(LessonKind);
