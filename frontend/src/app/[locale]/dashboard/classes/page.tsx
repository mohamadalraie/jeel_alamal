'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Users, GraduationCap, BookOpen, Zap } from 'lucide-react';
import { createClass } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useClasses, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { ClassItem } from '@/lib/types';

/* ─────────────────────────────────────── helpers ─── */

function ClassCard({ c }: { c: ClassItem }) {
  return (
    <Link href={`/dashboard/classes/${c.id}`}>
      <Card className="hover:border-primary/50 h-full transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {c.isIntensive ? (
              <Zap className="size-5 text-amber-500" />
            ) : (
              <BookOpen className="text-primary size-5" />
            )}
            {c.name}
            {c.isIntensive && (
              <Badge
                variant="outline"
                className="ms-auto bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-0.5"
              >
                مكثف
              </Badge>
            )}
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
  );
}

/* ─────────────────────────────── create-class dialog ─── */

function CreateClassDialog({
  instituteId,
  isIntensive,
  onCreated,
}: {
  instituteId: string;
  isIntensive: boolean;
  onCreated: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createClass(instituteId, { name, description: description || undefined, isIntensive });
      setOpen(false);
      setName('');
      setDescription('');
      onCreated();
      notify.success(t('createClass'));
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {isIntensive ? 'إنشاء حلقة مكثفة' : t('createClass')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIntensive && <Zap className="size-4 text-amber-500" />}
            {isIntensive ? 'إنشاء حلقة مكثفة' : t('createClass')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onCreate} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`new-class-name-${isIntensive ? 'i' : 'r'}`}>{t('className')}</Label>
            <Input
              id={`new-class-name-${isIntensive ? 'i' : 'r'}`}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`new-class-desc-${isIntensive ? 'i' : 'r'}`}>
              {t('classDescription')}
            </Label>
            <Input
              id={`new-class-desc-${isIntensive ? 'i' : 'r'}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {isIntensive && (
            <p className="text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              ⚡ ستُنشأ هذه الحلقة ضمن المسار المكثف للمعهد
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? tc('loading') : tc('create')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────── classes grid panel ─── */

function ClassesPanel({
  instituteId,
  track,
  canManage,
  onCreated,
}: {
  instituteId: string;
  track: 'regular' | 'intensive';
  canManage: boolean;
  onCreated: () => void;
}) {
  const tc = useTranslations('common');
  const { data: classes, isLoading, isError, error } = useClasses(instituteId, track);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = classes ?? [];
    const q = search.trim();
    return q ? list.filter((c) => c.name.includes(q)) : list;
  }, [classes, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} />
        {canManage && (
          <CreateClassDialog
            instituteId={instituteId}
            isIntensive={track === 'intensive'}
            onCreated={onCreated}
          />
        )}
      </div>

      {isLoading ? (
        <CardsSkeleton count={6} />
      ) : isError ? (
        <div className="p-6 text-center border border-destructive/30 bg-destructive/10 rounded-xl text-destructive">
          <p className="font-semibold text-sm">
            تعذر تحميل قائمة الحلقات (تأكد من تشغيل قاعدة البيانات PostgreSQL / Docker)
          </p>
          <p className="text-xs mt-1 text-muted-foreground">{String(error)}</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={track === 'intensive' ? Zap : BookOpen}
          title={
            track === 'intensive'
              ? 'لا توجد حلقات مكثفة بعد'
              : tc('noData')
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClassCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────── page ─── */

export default function ClassesPage() {
  const t = useTranslations('dashboard');
  const { selected, loading, user } = useInstitute();
  const canManage = user.role === 'super_admin' || user.role === 'institute_manager';
  const qc = useQueryClient();

  const refresh = () => {
    if (!selected) return;
    qc.invalidateQueries({ queryKey: qk.classes(selected.id, 'regular') });
    qc.invalidateQueries({ queryKey: qk.classes(selected.id, 'intensive') });
  };

  if (loading) return <CardsSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const showIntensive = selected.intensiveTrackEnabled;

  /* If intensive track is off, show a plain list with no tabs */
  if (!showIntensive) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold">{t('classes')}</h1>
        <ClassesPanel
          instituteId={selected.id}
          track="regular"
          canManage={canManage}
          onCreated={refresh}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t('classes')}</h1>

      <Tabs defaultValue="regular">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="regular" className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <BookOpen className="size-3.5" />
            المسار الأساسي
          </TabsTrigger>
          <TabsTrigger value="intensive" className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <Zap className="size-3.5 text-amber-500" />
            المسار المكثف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="mt-4">
          <ClassesPanel
            instituteId={selected.id}
            track="regular"
            canManage={canManage}
            onCreated={refresh}
          />
        </TabsContent>

        <TabsContent value="intensive" className="mt-4">
          <ClassesPanel
            instituteId={selected.id}
            track="intensive"
            canManage={canManage}
            onCreated={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
