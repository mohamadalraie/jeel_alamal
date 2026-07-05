import { LessonSettings } from './lesson-settings.entity';

export const LESSON_SETTINGS_REPOSITORY = Symbol('LESSON_SETTINGS_REPOSITORY');

/** Persistence port for per-institute lesson settings (spec 009). */
export interface LessonSettingsRepository {
  /** The saved settings for an institute, or null if none has been saved yet. */
  findByInstitute(instituteId: string): Promise<LessonSettings | null>;
  /** Create or update the institute's settings row (upsert on institute_id). */
  save(settings: LessonSettings): Promise<void>;
}
