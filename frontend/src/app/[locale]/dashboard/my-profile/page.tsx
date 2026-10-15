'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useInstitute } from '@/features/layout/institute-context';
import {
  useStudentProfile,
  useClassProfile,
  useStudentRecitation,
} from '@/lib/queries';
import { formatDateLocale } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfoCard } from '@/features/profiles/basic-info-card';
import { ProfileHeader } from '@/features/profiles/profile-header';
import { WeeklySchedule } from '@/features/classes/weekly-schedule';
import { HeartMap } from '@/features/recitation/heart-map';
import { RecitationLog } from '@/features/recitation/recitation-log';
import { StudentAttendanceView } from '@/features/attendance/student-attendance-view';
import { StudentLessonsView } from '@/features/lessons/student-lessons-view';
import { StudentDinarsView } from '@/features/dinars/student-dinars-view';
import { StudentAnalyticsView } from '@/features/analytics/student-analytics-view';
import { CardsSkeleton } from '@/features/shared/skeletons';

/** Student portal — the student sees only their own profile, class, and recitation. */
export default function MyProfilePage() {
  const t = useTranslations('dashboard');
  const tRec = useTranslations('recitation');
  const tAtt = useTranslations('attendance');
  const tLes = useTranslations('lessons');
  const tDin = useTranslations('dinars');
  const locale = useLocale();
  const { user } = useInstitute();

  const instituteId = user.instituteId ?? '';
  const { data: profile, isLoading } = useStudentProfile(instituteId, user.id);
  const classId = profile?.currentClass?.id ?? '';
  const intensiveClassId = profile?.intensiveClass?.id ?? '';
  const { data: classProfile } = useClassProfile(classId);
  const { data: intensiveClassProfile } = useClassProfile(intensiveClassId);
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
        timestamp: new Date(`${date}T12:00:00Z`).getTime(),
        date,
        ayahs,
      }));
  }, [recData?.log]);

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
          <TabsTrigger value="analytics">الإحصائيات والإنجاز</TabsTrigger>
          <TabsTrigger value="class">{t('myClass')}</TabsTrigger>
          {intensiveClassId && (
            <TabsTrigger value="intensiveClass">المسار المكثف</TabsTrigger>
          )}
          <TabsTrigger value="recitation">{tRec('tab')}</TabsTrigger>
          <TabsTrigger value="attendance">{tAtt('myAttendance')}</TabsTrigger>
          <TabsTrigger value="dinars">{tDin('tab')}</TabsTrigger>
          {classProfile?.class.lessonsVisibleToStudents && (
            <TabsTrigger value="lessons">{tLes('studentLessonsTab')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="analytics" className="pt-4">
          <StudentAnalyticsView instituteId={instituteId} studentId={user.id} />
        </TabsContent>

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

        {/* Tab 2.5: Intensive class — details + lesson times */}
        {intensiveClassId && (
          <TabsContent value="intensiveClass" className="flex flex-col gap-4 pt-4">
            {!intensiveClassProfile ? (
              <CardsSkeleton />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{intensiveClassProfile.class.name}</CardTitle>
                  </CardHeader>
                  {intensiveClassProfile.class.description && (
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        {intensiveClassProfile.class.description}
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
                      classId={profile.intensiveClass!.id}
                      initial={intensiveClassProfile.schedule}
                      canEdit={false}
                      onSaved={() => {}}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

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
                      <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted opacity-50" />
                        <XAxis
                          dataKey="timestamp"
                          type="number"
                          scale="time"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(val) =>
                            new Date(val).toLocaleDateString(formatDateLocale(locale), {
                              month: 'short',
                              day: 'numeric',
                            })
                          }
                          tick={{ fontSize: 11, fill: 'currentColor' }}
                          className="text-muted-foreground"
                          tickMargin={8}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: 'currentColor' }}
                          className="text-muted-foreground"
                          width={28}
                        />
                        <Tooltip
                          labelFormatter={(val) =>
                            new Date(val as number).toLocaleDateString(formatDateLocale(locale), {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          }
                          formatter={(val) => [`${val} ${tRec('ayahsShort')}`, tRec('ayahsShort')]}
                        />
                        <Line
                          type="monotone"
                          dataKey="ayahs"
                          name={tRec('ayahsShort')}
                          stroke="#BE9B5F"
                          strokeWidth={2.5}
                          dot={{ fill: '#BE9B5F', r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
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

              {/* Recitation Session Log */}
              {recData.log && recData.log.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{tRec('log')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecitationLog items={recData.log} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 4: Attendance — read-only stats + calendar + log */}
        <TabsContent value="attendance" className="pt-4">
          <StudentAttendanceView studentId={user.id} classId={classId || undefined} />
        </TabsContent>

        <TabsContent value="dinars" className="pt-4">
          <StudentDinarsView studentId={user.id} />
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
