'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Star, Trash2, UserPlus } from 'lucide-react';
import type { ClassProfile, User } from '@/lib/types';
import {
  getClassProfile,
  listTeachers,
  listManagers,
  listUnassignedStudents,
  updateClass,
  deleteClass,
  removeClassTeacher,
  setClassSupervisor,
  removeClassStudent,
  deleteMember,
  ApiError,
} from '@/lib/api';
import { Link, useRouter } from '@/i18n/navigation';
import { notify } from '@/lib/toast';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { GradeLabel } from '@/features/shared/grade-select';
import { WeeklySchedule } from '@/features/classes/weekly-schedule';
import { ClassAddMemberDialog } from '@/features/classes/class-add-member-dialog';
import { ClassRecitationTab } from '@/features/recitation/class-recitation-tab';
import { ClassAttendanceTab } from '@/features/attendance/class-attendance-tab';
import { ClassLessonsCalendar } from '@/features/attendance/class-lessons-calendar';

export default function ClassProfilePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tRec = useTranslations('recitation');
  const tAtt = useTranslations('attendance');
  const locale = useLocale();
  const router = useRouter();
  const { selected, user } = useInstitute();
  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft;

  const [profile, setProfile] = useState<ClassProfile | null>(null);
  const [allTeachers, setAllTeachers] = useState<User[]>([]);
  const [allManagers, setAllManagers] = useState<User[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [notFound, setNotFound] = useState(false);
  const instituteId = selected?.id ?? '';

  const load = useCallback(() => {
    getClassProfile(classId).then(setProfile).catch(() => setNotFound(true));
    if (selected) {
      listTeachers(selected.id).then(setAllTeachers).catch(() => setAllTeachers([]));
      // Managers can also teach/supervise a class (spec 007).
      listManagers(selected.id).then(setAllManagers).catch(() => setAllManagers([]));
      // Students eligible to enroll: those not in ANY class (one-class rule).
      listUnassignedStudents(selected.id)
        .then(setUnassignedStudents)
        .catch(() => setUnassignedStudents([]));
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
  // Candidates = institute teachers + managers, not already in the class.
  const addableTeachers = [
    ...allTeachers
      .filter((x) => !teacherIds.has(x.id))
      .map((x) => ({ id: x.id, name: `${x.firstName} ${x.lastName}` })),
    ...allManagers
      .filter((x) => !teacherIds.has(x.id))
      .map((x) => ({ id: x.id, name: `${x.firstName} ${x.lastName} (${t('manager')})` })),
  ];
  const enrollableStudents = unassignedStudents.map((x) => ({
    id: x.id,
    name: `${x.firstName} ${x.lastName}`,
  }));

  // Soft-delete a member from the whole institute.
  const softDelete = async (memberId: string) => {
    try {
      await deleteMember(instituteId, memberId);
      load();
      notify.success(t('deleteFromInstitute'));
    } catch (err) {
      notify.error(err, tc('error'));
    }
  };

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
        <TabsList className="w-full max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_[data-slot=tabs-trigger]]:flex-none sm:w-fit">
          <TabsTrigger value="students">{t('tabStudents')}</TabsTrigger>
          <TabsTrigger value="teachers">{t('tabTeachers')}</TabsTrigger>
          <TabsTrigger value="recitation">{tRec('classTab')}</TabsTrigger>
          <TabsTrigger value="attendance">{tAtt('tab')}</TabsTrigger>
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
              <div className="flex justify-end">
                <ClassAddMemberDialog
                  classId={classId}
                  instituteId={instituteId}
                  role="student"
                  options={enrollableStudents}
                  emptyHint={t('noUnassignedStudents')}
                  onDone={load}
                />
              </div>
              {students.length === 0 ? (
                <p className="text-muted-foreground text-sm">{tc('noData')}</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {students.map((s) => {
                    const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
                    return (
                      <li
                        key={s.id}
                        className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors"
                        onClick={() => router.push(`/dashboard/students/${s.id}`)}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Chevron className="text-muted-foreground size-3.5 shrink-0" />
                          {s.name}
                        </span>
                        <span
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge variant="outline">
                            <GradeLabel grade={s.schoolGrade} />
                          </Badge>
                          {canManage && (
                            <MemberRowMenu
                              memberId={s.id}
                              onEditHref={`/dashboard/students/${s.id}`}
                              onRemoveFromClass={async () => {
                                await removeClassStudent(classId, s.id);
                                load();
                              }}
                              onDeleteFromInstitute={() => softDelete(s.id)}
                            />
                          )}
                        </span>
                      </li>
                    );
                  })}
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
                <div className="flex justify-end">
                  <ClassAddMemberDialog
                    classId={classId}
                    instituteId={instituteId}
                    role="teacher"
                    options={addableTeachers}
                    emptyHint={t('noAvailableTeachers')}
                    onDone={load}
                  />
                </div>
              )}
              {teachers.length === 0 ? (
                <p className="text-muted-foreground text-sm">{tc('noData')}</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {teachers.map((te) => {
                    const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
                    return (
                      <li
                        key={te.id}
                        className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors"
                        onClick={() => router.push(`/dashboard/teachers/${te.id}`)}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Chevron className="text-muted-foreground size-3.5 shrink-0" />
                          {te.isSupervisor && <Star className="text-primary size-3.5 fill-current" />}
                          {te.name}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canManage ? (
                            <>
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
                              <MemberRowMenu
                                memberId={te.id}
                                onEditHref={`/dashboard/teachers/${te.id}`}
                                onRemoveFromClass={async () => {
                                  await removeClassTeacher(classId, te.id);
                                  load();
                                }}
                                onDeleteFromInstitute={() => softDelete(te.id)}
                              />
                            </>
                          ) : (
                            te.isSupervisor && <Badge>{t('supervisorBadge')}</Badge>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* التسميع — class recitation log */}
        <TabsContent value="recitation" className="pt-4">
          <ClassRecitationTab classId={classId} />
        </TabsContent>

        {/* الحضور — class attendance */}
        <TabsContent value="attendance" className="pt-4">
          <ClassAttendanceTab classId={classId} />
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
              <CardTitle>{t('lessonTimes')}</CardTitle>
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

        {/* 4 — Lessons: attendance calendar */}
        <TabsContent value="lessons" className="pt-4">
          <ClassLessonsCalendar classId={classId} schedule={schedule} />
        </TabsContent>

        {/* 5 — Activities (placeholder) */}
        <TabsContent value="activities" className="pt-4">
          <Placeholder icon={<UserPlus />} text={t('activitiesComingSoon')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Per-row actions for a class member: edit, remove from class, soft-delete. */
function MemberRowMenu({
  onEditHref,
  onRemoveFromClass,
  onDeleteFromInstitute,
}: {
  memberId: string;
  onEditHref: string;
  onRemoveFromClass: () => Promise<void> | void;
  onDeleteFromInstitute: () => void;
}) {
  const t = useTranslations('dashboard');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('actions')}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={onEditHref}>
            <Pencil className="size-4" />
            {t('edit')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onRemoveFromClass()}>
          {t('removeFromClass')}
        </DropdownMenuItem>
        <ConfirmDialog
          title={t('deleteFromInstitute')}
          message={t('deleteFromInstituteMsg')}
          onConfirm={onDeleteFromInstitute}
          trigger={
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              {t('deleteFromInstitute')}
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
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
