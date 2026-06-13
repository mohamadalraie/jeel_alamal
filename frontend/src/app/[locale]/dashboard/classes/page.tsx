'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Users, GraduationCap, BookOpen } from 'lucide-react';
import type { ClassItem } from '@/lib/types';
import { listClasses, createClass, ApiError } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** Classes (حلقات) of the selected institute — list + create; click → profile. */
export default function ClassesPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { selected, loading, user } = useInstitute();
  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';

  const [classes, setClasses] = useState<ClassItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!selected) return;
    listClasses(selected.id).then(setClasses).catch(() => setClasses([]));
  }, [selected]);
  useEffect(refresh, [refresh]);

  if (loading) return <p className="text-muted-foreground">{tc('loading')}</p>;
  if (!selected)
    return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await createClass(selected.id, { name, description: description || undefined });
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('classes')}</h1>
        {canManage && (
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
                  <Label htmlFor="new-class-name">{t('className')}</Label>
                  <Input id="new-class-name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-class-desc">{t('classDescription')}</Label>
                  <Input id="new-class-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? tc('loading') : tc('create')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {classes === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : classes.length === 0 ? (
        <p className="text-muted-foreground">{tc('noData')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="text-primary size-5" />
                    {c.name}
                  </CardTitle>
                  {c.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {c.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="text-muted-foreground flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="size-4" />
                    {c.teacherIds.length}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    {c.studentIds.length}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
