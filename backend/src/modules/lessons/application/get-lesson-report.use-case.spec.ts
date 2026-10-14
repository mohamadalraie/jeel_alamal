import { GetLessonReportUseCase } from './get-lesson-report.use-case';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { LessonReport } from '../domain/lesson-report.entity';

describe('GetLessonReportUseCase (spec 012)', () => {
  let useCase: GetLessonReportUseCase;
  let mockPolicy: any;
  let mockLessons: any;
  let mockReportRepo: any;
  let mockClasses: any;
  let mockUsers: any;

  const teacherActor: Actor = { userId: 't-1', role: UserRole.Teacher, instituteId: 'inst-1' };
  const studentActor: Actor = { userId: 's-1', role: UserRole.Student, instituteId: 'inst-1' };
  const unEnrolledStudent: Actor = { userId: 's-2', role: UserRole.Student, instituteId: 'inst-1' };
  const managerActor: Actor = { userId: 'm-1', role: UserRole.InstituteManager, instituteId: 'inst-1' };

  const fakeReport = LessonReport.create({
    lessonClassId: 'binding-1',
    mainIdeas: 'الأفكار الأساسية العامة',
    positives: 'إيجابيات خاصة بالمعلم',
    negatives: 'سلبيات خاصة بالإدارة',
    teacherNotes: 'ملاحظة داخلية أثناء الدرس',
    submittedBy: 't-1',
  });

  const fakeBinding = {
    id: 'binding-1',
    lessonId: 'lesson-1',
    classId: 'class-1',
    teacherId: 't-1',
    actualStartTime: new Date(),
    actualEndTime: new Date(),
  };

  const fakeLesson = {
    id: 'lesson-1',
    instituteId: 'inst-1',
    name: 'تجويد النون',
    date: '2026-10-15',
    expectedDurationMinutes: 45,
    kind: 'lesson',
    subjectId: null,
  };

  beforeEach(() => {
    mockPolicy = {
      assertStaffOf: jest.fn().mockResolvedValue(undefined),
    };
    mockLessons = {
      findBindingById: jest.fn().mockResolvedValue(fakeBinding),
      findLessonById: jest.fn().mockResolvedValue(fakeLesson),
      listSubjects: jest.fn().mockResolvedValue([]),
    };
    mockReportRepo = {
      findByBindingId: jest.fn().mockResolvedValue(fakeReport),
    };
    mockClasses = {
      findById: jest.fn().mockResolvedValue({ id: 'class-1', name: 'حلقة النور', instituteId: 'inst-1' }),
      findCurrentClassOfStudent: jest.fn().mockImplementation((studentId) =>
        studentId === 's-1' ? Promise.resolve({ id: 'class-1' }) : Promise.resolve(null),
      ),
      findCurrentIntensiveClassOfStudent: jest.fn().mockResolvedValue(null),
    };
    mockUsers = {
      findById: jest.fn().mockResolvedValue({ id: 't-1', fullName: 'الشيخ أحمد' }),
    };

    useCase = new GetLessonReportUseCase(
      mockPolicy,
      mockLessons,
      mockReportRepo,
      mockClasses,
      mockUsers,
    );
  });

  it('returns full report with positives, negatives and notes for teacher', async () => {
    const report = await useCase.execute(teacherActor, 'binding-1');

    expect(report.mainIdeas).toBe('الأفكار الأساسية العامة');
    expect(report.positives).toBe('إيجابيات خاصة بالمعلم');
    expect(report.negatives).toBe('سلبيات خاصة بالإدارة');
    expect(report.teacherNotes).toBe('ملاحظة داخلية أثناء الدرس');
    expect(report.canEdit).toBe(true);
  });

  it('sanitizes report for student by omitting positives, negatives and notes', async () => {
    const report = await useCase.execute(studentActor, 'binding-1');

    expect(report.mainIdeas).toBe('الأفكار الأساسية العامة');
    expect(report.positives).toBeUndefined();
    expect(report.negatives).toBeUndefined();
    expect(report.teacherNotes).toBeUndefined();
    expect(report.canEdit).toBe(false);
  });

  it('rejects un-enrolled student', async () => {
    await expect(useCase.execute(unEnrolledStudent, 'binding-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
