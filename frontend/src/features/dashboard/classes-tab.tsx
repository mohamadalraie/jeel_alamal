'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Star } from 'lucide-react';
import type { ClassItem, User } from '@/lib/types';
import {
  listClasses,
  listTeachers,
  listStudents,
  createClass,
  addClassTeacher,
  setClassSupervisor,
  enrollStudent,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Picker + action button for adding a member to a class. Reused for both roles. */
function AddMemberPicker({
  options,
  placeholder,
  actionLabel,
  onAdd,
}: {
  options: User[];
  placeholder: string;
  actionLabel: string;
  onAdd: (userId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        disabled={!selected || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onAdd(selected);
            setSelected('');
          } finally {
            setBusy(false);
          }
        }}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

/** Classes (حلقات) of an institute: list, create, teachers/supervisor, enrollment. */
export function ClassesTab({ instituteId }: { instituteId: string }) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  const [classes, setClasses] = useState<ClassItem[] | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    listClasses(instituteId).then(setClasses).catch(() => setClasses([]));
    listTeachers(instituteId).then(setTeachers).catch(() => setTeachers([]));
    listStudents(instituteId).then(setStudents).catch(() => setStudents([]));
  }, [instituteId]);
  useEffect(refresh, [refresh]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of [...teachers, ...students]) {
      map.set(u.id, `${u.firstName} ${u.lastName}`);
    }
    return (id: string) => map.get(id) ?? id;
  }, [teachers, students]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createClass(instituteId, {
        name,
        description: description || undefined,
      });
      setOpen(false);
      setName('');
      setDescription('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus data-icon="inline-start" />
              {t('createClass')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('createClass')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="class-name">{t('className')}</Label>
                <Input
                  id="class-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="class-desc">{t('classDescription')}</Label>
                <Input
                  id="class-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? tc('loading') : tc('create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {classes === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : classes.length === 0 ? (
        <p className="text-muted-foreground">{tc('noData')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {classes.map((klass) => {
            const enrollable = students.filter(
              (s) => !klass.studentIds.includes(s.id),
            );
            const addable = teachers.filter(
              (te) => !klass.teacherIds.includes(te.id),
            );
            return (
              <Card key={klass.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{klass.name}</span>
                    <Badge variant="secondary">
                      {t('classStudents')}: {klass.studentIds.length}
                    </Badge>
                  </CardTitle>
                  {klass.description && (
                    <p className="text-muted-foreground text-sm">
                      {klass.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-medium">{t('classTeachers')}</h4>
                    {klass.teacherIds.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {tc('noData')}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {klass.teacherIds.map((id) => (
                          <li
                            key={id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="flex items-center gap-1.5">
                              {klass.supervisorId === id && (
                                <Star className="text-primary size-3.5 fill-current" />
                              )}
                              {nameOf(id)}
                            </span>
                            {klass.supervisorId !== id && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={async () => {
                                  await setClassSupervisor(klass.id, id);
                                  refresh();
                                }}
                              >
                                {t('setSupervisor')}
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {addable.length > 0 && (
                      <AddMemberPicker
                        options={addable}
                        placeholder={t('selectTeacher')}
                        actionLabel={t('addToClass')}
                        onAdd={async (id) => {
                          await addClassTeacher(klass.id, id);
                          refresh();
                        }}
                      />
                    )}
                  </div>

                  <div className="border-border flex flex-col gap-2 border-t pt-3">
                    <h4 className="text-sm font-medium">{t('classStudents')}</h4>
                    {klass.studentIds.length > 0 && (
                      <p className="text-muted-foreground text-sm">
                        {klass.studentIds.map(nameOf).join('، ')}
                      </p>
                    )}
                    {enrollable.length > 0 && (
                      <AddMemberPicker
                        options={enrollable}
                        placeholder={t('selectStudent')}
                        actionLabel={t('enrollStudent')}
                        onAdd={async (id) => {
                          await enrollStudent(klass.id, id);
                          refresh();
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
