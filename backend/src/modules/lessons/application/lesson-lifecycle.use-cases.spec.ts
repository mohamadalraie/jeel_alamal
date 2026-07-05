import {
  StartLessonUseCase,
  EndLessonUseCase,
} from './lesson-lifecycle.use-cases';
import { Lesson } from '../domain/lesson.entity';
import { LessonClassBinding } from '../domain/lesson-class-binding.entity';
import { LessonSettings } from '../domain/lesson-settings.entity';
import { LessonKind } from '../domain/lesson-kind';
import type { LessonRepository } from '../domain/lesson.repository';
import type { LessonSettingsRepository } from '../domain/lesson-settings.repository';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from '../../../shared/domain/domain.error';

const teacher: Actor = { userId: 't1', role: UserRole.Teacher, instituteId: 'inst-1' };
const other: Actor = { userId: 't2', role: UserRole.Teacher, instituteId: 'inst-1' };

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** Minimal in-memory repo holding one lesson + one binding. */
function makeRepo(date: string, expected: number | null) {
  const lesson = Lesson.create({
    instituteId: 'inst-1',
    kind: LessonKind.Lesson,
    name: 'L',
    date,
    expectedDurationMinutes: expected,
    createdBy: 'mgr-1',
  });
  const binding = LessonClassBinding.create({
    lessonId: lesson.id,
    classId: 'c1',
    teacherId: 't1',
  });
  const repo: Partial<LessonRepository> = {
    findBindingById: async (id) => (id === binding.id ? binding : null),
    findLessonById: async (id) => (id === lesson.id ? lesson : null),
    updateBindingLifecycle: async (b, prior) => {
      // Simulate the conditional write against the current stored status.
      // The entity has already transitioned, so compare against the prior arg
      // that the use-case expects to still be true.
      void b;
      void prior;
      return true;
    },
  };
  return { repo: repo as LessonRepository, binding, lesson };
}

const settingsRepo = (settings: LessonSettings | null): LessonSettingsRepository => ({
  findByInstitute: async () => settings,
  save: async () => {},
});

describe('StartLessonUseCase (spec 009)', () => {
  it('starts a today lesson by its assigned teacher', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    await new StartLessonUseCase(repo).execute(teacher, binding.id);
    expect(binding.status).toBe('started');
    expect(binding.actualStartTime).not.toBeNull();
  });

  it('rejects a non-owner teacher', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    await expect(new StartLessonUseCase(repo).execute(other, binding.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejects a future-dated lesson', async () => {
    const { repo, binding } = makeRepo(tomorrow(), 45);
    await expect(new StartLessonUseCase(repo).execute(teacher, binding.id)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('allows starting a past (not_given) lesson', async () => {
    const { repo, binding } = makeRepo(yesterday(), 45);
    await new StartLessonUseCase(repo).execute(teacher, binding.id);
    expect(binding.status).toBe('started');
  });

  it('reports a conflict when the conditional write matches no row', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    repo.updateBindingLifecycle = async () => false;
    await expect(new StartLessonUseCase(repo).execute(teacher, binding.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe('EndLessonUseCase (spec 009)', () => {
  const start = (binding: LessonClassBinding, minutesAgo: number) => {
    binding.start(new Date(Date.now() - minutesAgo * 60_000));
  };

  it('finishes a lesson within threshold', async () => {
    const { repo, binding, lesson } = makeRepo(today(), 45);
    start(binding, 45);
    const result = await new EndLessonUseCase(
      repo,
      settingsRepo(LessonSettings.defaults(lesson.instituteId)),
    ).execute(teacher, binding.id);
    expect(result.status).toBe('finished');
    expect(binding.status).toBe('finished');
  });

  it('marks over_time when far beyond threshold', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    start(binding, 70); // 70 > 45 + 10
    const result = await new EndLessonUseCase(repo, settingsRepo(null)).execute(
      teacher,
      binding.id,
    );
    expect(result.status).toBe('over_time');
  });

  it('marks under_time when far below threshold', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    start(binding, 20); // 20 < 45 - 10
    const result = await new EndLessonUseCase(repo, settingsRepo(null)).execute(
      teacher,
      binding.id,
    );
    expect(result.status).toBe('under_time');
  });

  it('rejects ending a lesson that never started', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    await expect(
      new EndLessonUseCase(repo, settingsRepo(null)).execute(teacher, binding.id),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejects a non-owner teacher', async () => {
    const { repo, binding } = makeRepo(today(), 45);
    start(binding, 45);
    await expect(
      new EndLessonUseCase(repo, settingsRepo(null)).execute(other, binding.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
