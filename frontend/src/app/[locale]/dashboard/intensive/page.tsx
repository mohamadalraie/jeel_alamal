'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Users, GraduationCap, BookOpen, Sparkles } from 'lucide-react';
import { createClass } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useClasses, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/features/shared/empty-state';
import { SearchInput } from '@/features/shared/search-input';
import { CardsSkeleton } from '@/features/shared/skeletons';

export default function IntensiveClassesPage() {
  const t = useTranslations('dashboard');
  const tIntensive = useTranslations('intensiveTrack');
  const tc = useTranslations('common');
  const { selected, loading, user } = useInstitute();
  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';
  const qc = useQueryClient();
  const { data: classes, isLoading, isError, error } = useClasses(selected?.id, 'intensive');

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const list = classes ?? [];
    const q = search.trim();
    return q ? list.filter((c) => c.name.includes(q)) : list;
  }, [classes, search]);

  const stats = useMemo(() => {
    const list = classes ?? [];
    const totalClasses = list.length;
    const totalStudents = list.reduce((acc, c) => acc + (c.isIntensive ? c.intensiveStudentIds.length : c.studentIds.length), 0);
    const uniqueTeachers = new Set(list.flatMap(c => c.teacherIds)).size;
    return { totalClasses, totalStudents, uniqueTeachers };
  }, [classes]);

  if (loading) return <CardsSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await createClass(selected.id, {
        name,
        description: description || undefined,
        isIntensive: true,
      });
      setOpen(false);
      setName('');
      setDescription('');
      qc.invalidateQueries({ queryKey: qk.classes(selected.id, 'intensive') });
      notify.success(tIntensive('intensiveClass'));
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{tIntensive('label')}</h1>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
            <Sparkles className="size-3" />
            {tIntensive('badge')}
          </Badge>
        </div>
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
                <DialogTitle>{tIntensive('intensiveClass')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-intensive-class-name">{t('className')}</Label>
                  <Input
                    id="new-intensive-class-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-intensive-class-desc">{t('classDescription')}</Label>
                  <Input
                    id="new-intensive-class-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? tc('loading') : tc('create')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dashboard Stats */}
      {!isLoading && !isError && classes && classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="py-4 pb-2">
              <CardDescription className="font-medium text-amber-700 dark:text-amber-400">إجمالي الحلقات المكثفة</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">{stats.totalClasses}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="py-4 pb-2">
              <CardDescription className="font-medium text-amber-700 dark:text-amber-400">الطلاب في المسار المكثف</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">{stats.totalStudents}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="py-4 pb-2">
              <CardDescription className="font-medium text-amber-700 dark:text-amber-400">الأساتذة المشاركون</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">{stats.uniqueTeachers}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن حلقة مكثفة..." />

      {isLoading ? (
        <CardsSkeleton count={6} />
      ) : isError ? (
        <div className="p-6 text-center border border-destructive/30 bg-destructive/10 rounded-xl text-destructive">
          <p className="font-semibold text-sm">{t('error')}</p>
          <p className="text-xs mt-1 text-muted-foreground">{String(error)}</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title={tIntensive('emptyState')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
              <Card className="hover:border-primary/50 h-full transition-colors relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Sparkles className="text-amber-500 size-5" />
                      {c.name}
                    </span>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-transparent hover:bg-amber-500/20">{tIntensive('badge')}</Badge>
                  </CardTitle>
                  {c.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">{c.description}</p>
                  )}
                </CardHeader>
                <CardContent className="text-muted-foreground flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="size-4" />
                    {c.teacherIds.length}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    {c.isIntensive ? c.intensiveStudentIds.length : c.studentIds.length}
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
