/** A lesson source is an external link, an uploaded image, or an uploaded pdf. */
export enum LessonSourceKind {
  Link = 'link',
  Image = 'image',
  Pdf = 'pdf',
}

export const LESSON_SOURCE_KINDS = Object.values(LessonSourceKind);
