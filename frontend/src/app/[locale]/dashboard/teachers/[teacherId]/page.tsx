'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TeacherProfile } from '@/lib/types';
import { getTeacherProfile, updateTeacherBasic } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BasicInfoCard } from '@/features/profiles/basic-info-card';
import { TeacherExtendedCard } from '@/features/profiles/teacher-extended-card';
import { ProfileHeader } from '@/features/profiles/profile-header';

export default function TeacherProfilePage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = use(params);
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { selected, user } = useInstitute();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';

  const load = useCallback(() => {
    if (!selected) return;
    getTeacherProfile(selected.id, teacherId)
      .then(setProfile)
      .catch(() => setNotFound(true));
  }, [selected, teacherId]);
  useEffect(load, [load]);

  if (!selected) {
    return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;
  }
  if (notFound) {
    router.replace('/dashboard/teachers');
    return null;
  }
  if (!profile) return <p className="text-muted-foreground">{tc('loading')}</p>;

  const { teacher, classes } = profile;

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader
        name={`${teacher.firstName} ${teacher.lastName}`}
        username={teacher.username}
        badge={t('teachers')}
        backHref="/dashboard/teachers"
      />

      <BasicInfoCard
        user={teacher}
        canEdit={canManage}
        onSave={async (input) => {
          await updateTeacherBasic(selected.id, teacherId, input);
          load();
        }}
      />

      {/* Extended details are returned by the API only for manager/super_admin. */}
      {teacher.teacherDetails ? (
        <TeacherExtendedCard
          instituteId={selected.id}
          teacherId={teacherId}
          details={teacher.teacherDetails}
          certifications={profile.certifications}
          onChanged={load}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{t('detailsRestricted')}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('teacherClasses')}</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('notInAnyClass')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <Badge key={c.id} variant="outline">
                  {c.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
