'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useInstitute } from '@/features/layout/institute-context';
import {
  useStudentProfile,
  useClassProfile,
  useStudentRecitation,
} from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfoCard } from '@/features/profiles/basic-info-card';
import { ProfileHeader } from '@/features/profiles/profile-header';
import { WeeklySchedule } from '@/features/classes/weekly-schedule';
import { HeartMap } from '@/features/recitation/heart-map';
import { StudentAttendanceView } from '@/features/attendance/student-attendance-view';
import { StudentLessonsView } from '@/features/lessons/student-lessons-view';
import { CardsSkeleton } from '@/features/shared/skeletons';

/** Student portal — the student sees only their own profile, class, and recitation. */
export default function MyProfilePage() {
  const t = useTranslations('dashboard');
  const tRec = useTranslations('recitation');
  const tAtt = useTranslations('attendance');
  const tLes = useTranslations('lessons');
  const locale = useLocale();
  const { user } = useInstitute();

  const instituteId = user.instituteId ?? '';
  const { data: profile, isLoading } = useStudentProfile(instituteId, user.id);
  const classId = profile?.currentClass?.id ?? '';
  const { data: classProfile } = useClassProfile(classId);
  const { data: recData } = useStudentRecitation(user.id);

  const chartData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of recData?.log ?? []) {
      const day = r.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (r.toAyah - r.fromAyah + 1));
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, ayahs]) => ({
        date: new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        ayahs,
      }));
  }, [recData?.log, locale]);

  if (isLoading || !profile) return <CardsSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader
        name={`${profile.student.firstName} ${profile.student.lastName}`}
        username={profile.student.username}
        badge={t('students')}
      />

      <Tabs defaultValue="info">
        <TabsList className="w-full max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_[data-slot=tabs-trigger]]:flex-none sm:w-fit">
          <TabsTrigger value="info">{t('basicInfo')}</TabsTrigger>
          <TabsTrigger value="class">{t('myClass')}</TabsTrigger>
          <TabsTrigger value="recitation">{tRec('tab')}</TabsTrigger>
          <TabsTrigger value="attendance">{tAtt('myAttendance')}</TabsTrigger>
          {classProfile?.class.lessonsVisibleToStudents && (
            <TabsTrigger value="lessons">{tLes('studentLessonsTab')}</TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Basic info — read-only for students */}
        <TabsContent value="info" className="pt-4">
          <BasicInfoCard
            user={profile.student}
            withSchoolGrade
            canEdit={false}
            onSave={async () => {}}
          />
        </TabsContent>

        {/* Tab 2: My class — details + lesson times */}
        <TabsContent value="class" className="flex flex-col gap-4 pt-4">
          {!profile.currentClass ? (
            <Card>
              <CardContent className="text-muted-foreground py-10 text-center text-sm">
                {t('notInClass')}
              </CardContent>
            </Card>
          ) : !classProfile ? (
            <CardsSkeleton />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{classProfile.class.name}</CardTitle>
                </CardHeader>
                {classProfile.class.description && (
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {classProfile.class.description}
                    </p>
                  </CardContent>
                )}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('lessonTimes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <WeeklySchedule
                    classId={profile.currentClass.id}
                    initial={classProfile.schedule}
                    canEdit={false}
                    onSaved={() => {}}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Recitation — read-only heart map + activity chart */}
        <TabsContent value="recitation" className="flex flex-col gap-4 pt-4">
          {!recData ? (
            <CardsSkeleton />
          ) : (
            <>
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{tRec('amountChart')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" width={28} />
                        <Tooltip />
                        <Bar dataKey="ayahs" name={tRec('ayahsShort')} fill="#BE9B5F" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>{tRec('memorizationMap')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <HeartMap cells={recData.heart} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 4: Attendance — read-only stats + calendar + log */}
        <TabsContent value="attendance" className="pt-4">
          <StudentAttendanceView studentId={user.id} classId={classId || undefined} />
        </TabsContent>

        {classProfile?.class.lessonsVisibleToStudents && classId && (
          <TabsContent value="lessons" className="pt-4">
            <StudentLessonsView classId={classId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
