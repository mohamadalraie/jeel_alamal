'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  BookOpenCheck,
  Coins,
  Play,
  Timer,
  Users,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import {
  useMyLessons,
  useClasses,
  useSurahs,
  useClassProfile,
  useQueryClient,
  qk,
} from '@/lib/queries';
import { startLesson, ApiError } from '@/lib/api';
import { notify } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardsSkeleton } from '@/features/shared/skeletons';
import { TakeAttendanceDialog } from '@/features/attendance/take-attendance-dialog';
import { AddRecitationDialog } from '@/features/recitation/add-recitation-dialog';
import { AwardDinarDialog } from '@/features/dinars/award-dinar-dialog';
import type { TeacherLessonEntry, ClassItem } from '@/lib/types';

/** Component representing a single Class card for the teacher with quick actions. */
function TeacherClassCard({
  classItem,
  instituteId,
  surahs,
}: {
  classItem: ClassItem;
  instituteId: string;
  surahs: any[];
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [recitationOpen, setRecitationOpen] = useState(false);
  const [dinarOpen, setDinarOpen] = useState(false);

  // Fetch full class profile to get updated student roster when needed
  const { data: profile } = useClassProfile(classItem.id);

  const roster = profile?.students ?? [];

  return (
    <Card className="flex flex-col justify-between overflow-hidden border border-border/60 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              <span>{classItem.name}</span>
            </CardTitle>
            {classItem.description && (
              <CardDescription className="line-clamp-1 text-xs">
                {classItem.description}
              </CardDescription>
            )}
          </div>
          <Badge variant="outline" className="flex items-center gap-1 text-xs shrink-0">
            <Users className="size-3" />
            <span>{classItem.studentIds.length}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Attendance Action */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs font-medium"
            onClick={() => setAttendanceOpen(true)}
            disabled={roster.length === 0}
          >
            <ClipboardCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('quickAttendance')}</span>
          </Button>

          {/* Recitation Action */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs font-medium"
            onClick={() => setRecitationOpen(true)}
            disabled={roster.length === 0}
          >
            <BookOpenCheck className="size-4 text-amber-600 dark:text-amber-400" />
            <span>{t('quickRecitation')}</span>
          </Button>

          {/* Dinars Action */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs font-medium"
            onClick={() => setDinarOpen(true)}
            disabled={roster.length === 0}
          >
            <Coins className="size-4 text-yellow-600 dark:text-yellow-400" />
            <span>{t('quickDinars')}</span>
          </Button>

          {/* Class Link */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Link href={`/dashboard/classes`}>
              <ChevronLeft className="size-4" />
              <span>{t('classDetails')}</span>
            </Link>
          </Button>
        </div>

        {/* Dialog Modals */}
        {attendanceOpen && (
          <TakeAttendanceDialog
            classId={classItem.id}
            roster={roster}
            open={attendanceOpen}
            onOpenChange={setAttendanceOpen}
            withTrigger={false}
            onDone={() => {
              qc.invalidateQueries({ queryKey: qk.classAttendance(classItem.id) });
              setAttendanceOpen(false);
            }}
          />
        )}

        {recitationOpen && (
          <AddRecitationDialog
            surahs={surahs ?? []}
            students={roster}
            onDone={() => {
              qc.invalidateQueries({ queryKey: qk.classRecitation(classItem.id) });
              setRecitationOpen(false);
            }}
          />
        )}

        {dinarOpen && (
          <AwardDinarDialog
            instituteId={instituteId}
            students={roster}
            context="general"
            onDone={() => {
              qc.invalidateQueries({ queryKey: qk.dinarLeaderboard(instituteId, classItem.id) });
              setDinarOpen(false);
            }}
            trigger={
              <button id={`dinar-trigger-${classItem.id}`} className="hidden" />
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

/** Teacher Quick Access Dashboard Page */
export default function TeacherDashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user, selected, loading } = useInstitute();
  const qc = useQueryClient();

  const [startingLessonId, setStartingLessonId] = useState<string | null>(null);

  // Queries
  const { data: lessonsData, isLoading: lessonsLoading } = useMyLessons(user.role === 'teacher');
  const { data: classes, isLoading: classesLoading } = useClasses(selected?.id);
  const { data: surahs } = useSurahs();

  if (loading || lessonsLoading || classesLoading) {
    return <CardsSkeleton />;
  }

  if (!selected) {
    return <p className="text-muted-foreground text-center py-10">{t('selectInstituteFirst')}</p>;
  }

  const entries: TeacherLessonEntry[] = lessonsData?.entries ?? [];

  // Ongoing/started lesson banner check
  const activeLesson = entries.find((l) => l.status === 'started');

  // Filter teacher's assigned classes
  const teacherClasses = (classes ?? []).filter((c) => c.teacherIds.includes(user.id));

  // Filter upcoming lessons (not finished, sorted by date)
  const upcomingLessons = entries.filter((l) => l.status !== 'finished');

  const handleStartLesson = async (lessonClassId: string) => {
    try {
      setStartingLessonId(lessonClassId);
      await startLesson(lessonClassId);
      qc.invalidateQueries({ queryKey: qk.myLessons });
      router.push(`/dashboard/lesson-timer?id=${lessonClassId}`);
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setStartingLessonId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{t('quickAccess')}</h1>
            <Badge variant="secondary" className="gap-1 font-normal">
              <Sparkles className="size-3 text-amber-500" />
              <span>{user.firstName} {user.lastName}</span>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t('quickAccessSubtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/my-lessons" className="gap-2">
              <CalendarClock className="size-4" />
              <span>{t('myLessons')}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Active Ongoing Lesson Banner */}
      {activeLesson && (
        <Card className="relative overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent shadow-md">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Timer className="size-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex size-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <span>{t('activeLesson')}</span>
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                    {activeLesson.className}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeLesson.name || t('lesson')} · {activeLesson.date}
                </p>
              </div>
            </div>

            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 font-semibold"
            >
              <Link href={`/dashboard/lesson-timer?id=${activeLesson.lessonClassId}`}>
                <Play className="size-4 fill-white" />
                <span>{t('continueTimer')}</span>
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Section 1: Teacher's Classes (حلقاتي) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">{t('myClasses')}</h2>
            <Badge variant="outline" className="text-xs">
              {teacherClasses.length}
            </Badge>
          </div>
        </div>

        {teacherClasses.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BookOpen className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">{t('noMyClasses')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherClasses.map((c) => (
              <TeacherClassCard
                key={c.id}
                classItem={c}
                instituteId={selected.id}
                surahs={surahs ?? []}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Upcoming Lessons (الدروس القادمة) */}
      <section className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">{t('upcomingLessons')}</h2>
            <Badge variant="outline" className="text-xs">
              {upcomingLessons.length}
            </Badge>
          </div>

          <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
            <Link href="/dashboard/my-lessons">
              <span>{t('view')}</span>
              <ChevronLeft className="size-3" />
            </Link>
          </Button>
        </div>

        {upcomingLessons.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <CalendarClock className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">{t('noUpcomingLessons')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingLessons.slice(0, 4).map((lesson) => {
              const isStarted = lesson.status === 'started';
              const isStartingThis = startingLessonId === lesson.lessonClassId;

              return (
                <Card
                  key={lesson.lessonClassId}
                  className={`flex flex-col justify-between p-5 transition-all border ${
                    lesson.isNext ? 'border-primary/50 shadow-sm bg-primary/5' : 'border-border/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-primary">
                          {lesson.className}
                        </span>
                        <h3 className="font-bold text-base leading-tight">
                          {lesson.name || (lesson.kind === 'recitation' ? t('recitation') : t('lesson'))}
                        </h3>
                      </div>
                      {lesson.category && (
                        <Badge
                          style={{
                            backgroundColor: `${lesson.category.color}20`,
                            color: lesson.category.color,
                            borderColor: `${lesson.category.color}40`,
                          }}
                          variant="outline"
                          className="text-xs font-medium shrink-0"
                        >
                          {lesson.category.name}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{lesson.date}</span>
                      {lesson.expectedDurationMinutes && (
                        <>
                          <span>•</span>
                          <span>{t('durationMinutes', { n: lesson.expectedDurationMinutes })}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <Badge
                      variant={isStarted ? 'default' : 'secondary'}
                      className={`text-xs ${isStarted ? 'bg-emerald-600' : ''}`}
                    >
                      {t(`status_${lesson.status}`)}
                    </Badge>

                    {isStarted ? (
                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5">
                        <Link href={`/dashboard/lesson-timer?id=${lesson.lessonClassId}`}>
                          <Play className="size-3.5 fill-white" />
                          <span>{t('continueTimer')}</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isStartingThis}
                        onClick={() => handleStartLesson(lesson.lessonClassId)}
                        className="text-xs gap-1.5"
                      >
                        <Play className="size-3.5" />
                        <span>{t('startLesson')}</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
