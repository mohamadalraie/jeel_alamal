'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { StudentProfile } from '@/lib/types';
import { getStudentProfile, updateStudent } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfoCard } from '@/features/profiles/basic-info-card';
import { ChangeClassCard } from '@/features/profiles/change-class-card';
import { StudentNotesCard } from '@/features/profiles/student-notes-card';
import { ProfileHeader } from '@/features/profiles/profile-header';
import { StudentRecitationTab } from '@/features/recitation/student-recitation-tab';

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tRec = useTranslations('recitation');
  const router = useRouter();
  const { selected } = useInstitute();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!selected) return;
    getStudentProfile(selected.id, studentId)
      .then(setProfile)
      .catch(() => setNotFound(true));
  }, [selected, studentId]);
  useEffect(load, [load]);

  if (!selected) {
    return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;
  }
  if (notFound) {
    router.replace('/dashboard/students');
    return null;
  }
  if (!profile) return <p className="text-muted-foreground">{tc('loading')}</p>;

  const { student, currentClass } = profile;

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader
        name={`${student.firstName} ${student.lastName}`}
        username={student.username}
        badge={t('students')}
        backHref="/dashboard/students"
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('basicInfo')}</TabsTrigger>
          <TabsTrigger value="recitation">{tRec('tab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="flex flex-col gap-4 pt-4">
          <BasicInfoCard
            user={student}
            withSchoolGrade
            canEdit
            onSave={async (input) => {
              await updateStudent(selected.id, studentId, input);
              load();
            }}
          />
          <ChangeClassCard
            instituteId={selected.id}
            studentId={studentId}
            currentClass={currentClass}
            onChanged={load}
          />
          <StudentNotesCard instituteId={selected.id} studentId={studentId} />
        </TabsContent>

        <TabsContent value="recitation" className="pt-4">
          <StudentRecitationTab studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
