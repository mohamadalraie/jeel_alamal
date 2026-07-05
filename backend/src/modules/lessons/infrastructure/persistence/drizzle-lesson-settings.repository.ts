import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { LessonSettings } from '../../domain/lesson-settings.entity';
import type { LessonSettingsRepository } from '../../domain/lesson-settings.repository';
import { lessonSettings, type LessonSettingsRow } from './lesson.schema';

const toSettings = (r: LessonSettingsRow): LessonSettings =>
  LessonSettings.reconstitute(r.instituteId, {
    instituteId: r.instituteId,
    durationThresholdMinutes: r.durationThresholdMinutes,
    durationStatusEnabled: r.durationStatusEnabled,
    updatedAt: r.updatedAt,
  });

@Injectable()
export class DrizzleLessonSettingsRepository implements LessonSettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findByInstitute(instituteId: string): Promise<LessonSettings | null> {
    const [row] = await this.db
      .select()
      .from(lessonSettings)
      .where(eq(lessonSettings.instituteId, instituteId))
      .limit(1);
    return row ? toSettings(row) : null;
  }

  async save(settings: LessonSettings): Promise<void> {
    await this.db
      .insert(lessonSettings)
      .values({
        id: randomUUID(),
        instituteId: settings.instituteId,
        durationThresholdMinutes: settings.durationThresholdMinutes,
        durationStatusEnabled: settings.durationStatusEnabled,
        updatedAt: settings.updatedAt,
      })
      .onConflictDoUpdate({
        target: lessonSettings.instituteId,
        set: {
          durationThresholdMinutes: settings.durationThresholdMinutes,
          durationStatusEnabled: settings.durationStatusEnabled,
          updatedAt: settings.updatedAt,
        },
      });
  }
}
