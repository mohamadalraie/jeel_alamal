import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { LESSON_SETTINGS_REPOSITORY } from '../domain/lesson-settings.repository';
import type { LessonSettingsRepository } from '../domain/lesson-settings.repository';
import { LessonSettings } from '../domain/lesson-settings.entity';
import { LessonSettingsView, UpdateLessonSettingsDto } from './dto/lesson.dto';

const toView = (s: LessonSettings): LessonSettingsView => ({
  durationThresholdMinutes: s.durationThresholdMinutes,
  durationStatusEnabled: s.durationStatusEnabled,
});

/** Read the institute's lesson settings, falling back to defaults. Staff. */
@Injectable()
export class GetLessonSettingsUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_SETTINGS_REPOSITORY)
    private readonly settings: LessonSettingsRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<LessonSettingsView> {
    await this.policy.assertStaffOf(actor, instituteId);
    const found = await this.settings.findByInstitute(instituteId);
    return toView(found ?? LessonSettings.defaults(instituteId));
  }
}

/** Create or update the institute's lesson settings. Manager only. */
@Injectable()
export class UpdateLessonSettingsUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_SETTINGS_REPOSITORY)
    private readonly settings: LessonSettingsRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: UpdateLessonSettingsDto,
  ): Promise<LessonSettingsView> {
    await this.policy.assertManagerOf(actor, instituteId);
    const current =
      (await this.settings.findByInstitute(instituteId)) ??
      LessonSettings.defaults(instituteId);
    current.update({
      durationThresholdMinutes: dto.durationThresholdMinutes,
      durationStatusEnabled: dto.durationStatusEnabled,
    });
    await this.settings.save(current);
    return toView(current);
  }
}
