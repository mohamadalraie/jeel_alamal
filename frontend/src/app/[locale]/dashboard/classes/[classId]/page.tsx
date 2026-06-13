'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, ArrowLeft, Star, Trash2, UserPlus } from 'lucide-react';
import type { ClassProfile, User } from '@/lib/types';
import {
  getClassProfile,
  listTeachers,
  listStudents,
  updateClass,
  deleteClass,
  addClassTeacher,
  removeClassTeacher,
  setClassSupervisor,
  enrollStudent,
  removeClassStudent,
  ApiError,
} from '@/lib/api';
import { Link, useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { GradeLabel } from '@/features/shared/grade-select';
import { WeeklySchedule } from '@/features/classes/weekly-schedule';
import { MemberPicker } from '@/features/classes/member-picker';

export default function ClassProfilePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { selected, user } = useInstitute();
  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft;

  const [profile, setProfile] = useState<ClassProfile | null>(null);
  const [allTeachers, setAllTeachers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    getClassProfile(classId).then(setProfile).catch(() => setNotFound(true));
    if (selected) {
      listTeachers(selected.id).then(setAllTeachers).catch(() => setAllTeachers([]));
      listStudents(selected.id).then(setAllStudents).catch(() => setAllStudents([]));
    }
  }, [classId, selected]);
  useEffect(load, [load]);

  if (notFound) {
    router.replace('/dashboard/classes');
    return null;
  }
  if (!profile) return <p className="text-muted-foreground">{tc('loading')}</p>;

  const { class: klass, teachers, students, schedule } = profile;
  const teacherIds = new Set(teachers.map((x) => x.id));
  const studentIds = new Set(students.map((x) => x.id));
  const addableTeachers = allTeachers
    .filter((x) => !teacherIds.has(x.id))
    .map((x) => ({ id: x.id, name: `${x.firstName} ${x.lastName}` }));
  const enrollableStudents = allStudents
    .filter((x) => !studentIds.has(x.id))
    .map((x) => ({ id: x.id, name: `${x.firstName} ${x.lastName}` }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label={t('back')}>
          <Link href="/dashboard/classes">
            <BackArrow />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{klass.name}</h1>
        <Badge variant="secondary">{t('classProfile')}</Badge>
      </div>

      <Tabs defaultValue="students">
        <TabsList className="flex-wrap">
          <TabsTrigger value="students">{t('tabStudents')}</TabsTrigger>
          <TabsTrigger value="teachers">{t('tabTeachers')}</TabsTrigger>
          <TabsTrigger value="details">{t('tabDetails')}</TabsTrigger>
          <TabsTrigger value="lessons">{t('tabLessons')}</TabsTrigger>
          <TabsTrigger value="activities">{t('tabActivities')}</TabsTrigger>
        </TabsList>

        {/* 1 — Students */}
        <TabsContent value="students" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('tabStudents')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <MemberPicker
                options={enrollableStudents}
                placeholder={t('selectStudent')}
                actionLabel={t('enrollInClass')}
                onAdd={async (id) => {
                  await enrollStudent(classId, id);
                  load();
                }}
              />
              {students.length === 0 ? (
                <p className="text-muted-foreground text-sm">{tc('noData')}</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {students.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                      <Link
                        href={`/dashboard/students/${s.id}`}
                        className="hover:text-primary text-sm font-medium"
                      >
                        {s.name}
                      </Link>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">
                          <GradeLabel grade={s.schoolGrade} />
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('removeFromClass')}
                          onClick={async () => {
                            await removeClassStudent(classId, s.id);
                            load();
                          }}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2 — Teachers + supervisor */}
        <TabsContent value="teachers" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('tabTeachers')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {canManage && (
                <MemberPicker
                  options={addableTeachers}
                  placeholder={t('selectTeacher')}
                  actionLabel={t('addTeacherToClass')}
                  onAdd={async (id) => {
                    await addClassTeacher(classId, id);
                    load();
                  }}
                />
              )}
              {teachers.length === 0 ? (
                <p className="text-muted-foreground text-sm">{tc('noData')}</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {teachers.map((te) => (
                    <li key={te.id} className="flex items-center justify-between gap-2 py-2">
                      <Link
                        href={`/dashboard/teachers/${te.id}`}
                        className="hover:text-primary flex items-center gap-1.5 text-sm font-medium"
                      >
                        {te.isSupervisor && <Star className="text-primary size-3.5 fill-current" />}
                        {te.name}
                      </Link>
                      {canManage && (
                        <span className="flex items-center gap-1">
                          {te.isSupervisor ? (
                            <Badge>{t('supervisorBadge')}</Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await setClassSupervisor(classId, te.id);
                                load();
                              }}
                            >
                              {t('makeSupervisor')}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('removeFromClass')}
                            onClick={async () => {
                              await removeClassTeacher(classId, te.id);
                              load();
                            }}
                          >
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3 — Details + weekly schedule */}
        <TabsContent value="details" className="flex flex-col gap-4 pt-4">
          <ClassDetailsCard
            classId={classId}
            name={klass.name}
            description={klass.description}
            canManage={canManage}
            onSaved={load}
            onDeleted={() => router.replace('/dashboard/classes')}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t('attendanceTimes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklySchedule
                classId={classId}
                initial={schedule}
                canEdit={canManage}
                onSaved={load}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4 — Lessons (placeholder) */}
        <TabsContent value="lessons" className="pt-4">
          <Placeholder icon={<UserPlus />} text={t('lessonsComingSoon')} />
        </TabsContent>

        {/* 5 — Activities (placeholder) */}
        <TabsContent value="activities" className="pt-4">
          <Placeholder icon={<UserPlus />} text={t('activitiesComingSoon')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
        <span className="opacity-50">{icon}</span>
        {text}
      </CardContent>
    </Card>
  );
}

function ClassDetailsCard({
  classId,
  name,
  description,
  canManage,
  onSaved,
  onDeleted,
}: {
  classId: string;
  name: string;
  description: string | null;
  canManage: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [form, setForm] = useState({ name, description: description ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateClass(classId, {
        name: form.name,
        description: form.description || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('classDetails')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-name">{t('className')}</Label>
            <Input
              id="cls-name"
              required
              disabled={!canManage}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-desc">{t('classDescription')}</Label>
            <Input
              id="cls-desc"
              disabled={!canManage}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          {canManage && (
            <div className="flex items-center justify-between gap-2">
              <ConfirmDialog
                onConfirm={async () => {
                  await deleteClass(classId);
                  onDeleted();
                }}
                trigger={
                  <Button type="button" variant="destructive" size="sm">
                    <Trash2 data-icon="inline-start" />
                    {t('deleteClass')}
                  </Button>
                }
              />
              <Button type="submit" disabled={busy}>
                {busy ? tc('loading') : tc('save')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
