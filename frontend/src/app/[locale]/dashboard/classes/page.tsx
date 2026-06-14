'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Users, GraduationCap, BookOpen } from 'lucide-react';
import { createClass } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useClasses, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
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
import { EmptyState } from '@/features/shared/empty-state';
import { SearchInput } from '@/features/shared/search-input';
import { CardsSkeleton } from '@/features/shared/skeletons';

export default function ClassesPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { selected, loading, user } = useInstitute();
  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';
  const qc = useQueryClient();
  const { data: classes, isLoading } = useClasses(selected?.id);

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

  if (loading) return <CardsSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await createClass(selected.id, { name, description: description || undefined });
      setOpen(false);
      setName('');
      setDescription('');
      qc.invalidateQueries({ queryKey: qk.classes(selected.id) });
      notify.success(t('createClass'));
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? tc('loading') : tc('create')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} />

      {isLoading ? (
        <CardsSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title={tc('noData')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="text-primary size-5" />
                    {c.name}
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
