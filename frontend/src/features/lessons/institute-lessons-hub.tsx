'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MoreVertical, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { InstituteLesson, ProgramEntry } from '@/lib/types';
import { deleteLesson, removeLessonClass } from '@/lib/api';
import { useInstituteLessons, useLessonCategories, useQueryClient, qk } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSkeleton } from '@/features/shared/skeletons';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { LessonProgramList } from './lesson-program-list';
import { AddLessonDialog, type LessonEditing } from './add-lesson-dialog';
import { CategoryManager } from './category-manager';

/**
 * Flatten institute lessons into one ProgramEntry per class binding so that
 * LessonProgramList can render them — each binding gets its own row with its
 * own status, teacher, and class name displayed.
 */
function toEntries(lessons: InstituteLesson[]): ProgramEntry[] {
  const result: ProgramEntry[] = [];
  lessons.forEach((lesson, li) => {
    lesson.classes.forEach((cls, ci) => {
      result.push({
        lessonClassId: cls.lessonClassId,
        lessonId: lesson.lessonId,
        kind: lesson.kind,
        name: lesson.name,
        description: lesson.description,
        category: lesson.category,
        date: lesson.date,
        sort: li * 100 + ci,
        expectedDurationMinutes: lesson.expectedDurationMinutes,
        status: cls.status,
        actualStartTime: cls.actualStartTime,
        actualEndTime: cls.actualEndTime,
        teacher: cls.teacher,
        className: cls.className,
        sources: lesson.sources,
      });
    });
  });
  return result;
}

/**
 * Manager hub: institute-wide lessons using the same month → day layout as the
 * class lessons tab. Each row is one class binding (lesson × class), showing the
 * class name, teacher, and live status independently.
 */
export function InstituteLessonsHub({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const qc = useQueryClient();
  const { data, isLoading } = useInstituteLessons(instituteId);
  const { data: categories = [] } = useLessonCategories(instituteId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonEditing | null>(null);
  const [presetDate, setPresetDate] = useState<string>();

  const refresh = () => qc.invalidateQueries({ queryKey: qk.instituteLessons(instituteId) });

  const openCreate = (ymd?: string) => {
    setEditing(null);
    setPresetDate(ymd);
    setDialogOpen(true);
  };

  const openEdit = (e: ProgramEntry) => {
    const lesson = data?.entries.find((l) => l.lessonId === e.lessonId);
    if (!lesson) return;
    setEditing({
      lessonId: lesson.lessonId,
      kind: lesson.kind,
      name: lesson.name,
      description: lesson.description,
      categoryId: lesson.category?.id ?? null,
      date: lesson.date,
      expectedDurationMinutes: lesson.expectedDurationMinutes,
      sources: lesson.sources.map((s) => ({
        kind: s.kind,
        url: s.url,
        description: s.description ?? undefined,
      })),
    });
    setPresetDate(undefined);
    setDialogOpen(true);
  };

  if (isLoading || !data) return <ListSkeleton />;

  const entries = toEntries(data.entries);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('hubTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('hubSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryManager instituteId={instituteId} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/lessons/settings">
              <Settings data-icon="inline-start" className="size-4" />
              {t('lessonSettings')}
            </Link>
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus data-icon="inline-start" />
            {t('addLesson')}
          </Button>
        </div>
      </div>

      <LessonProgramList
        entries={entries}
        emptyText={t('noLessons')}
        showTeacher
        showClass
        onAddDay={(ymd) => openCreate(ymd)}
        renderActions={(e) => (
          <EntryMenu
            onEdit={() => openEdit(e)}
            onRemoveFromClass={async () => {
              await removeLessonClass(e.lessonClassId);
              refresh();
            }}
            onDelete={async () => {
              await deleteLesson(e.lessonId);
              refresh();
            }}
          />
        )}
      />

      <AddLessonDialog
        instituteId={instituteId}
        categories={categories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={refresh}
        preselectDate={presetDate}
        editing={editing}
      />
    </div>
  );
}

function EntryMenu({
  onEdit,
  onRemoveFromClass,
  onDelete,
}: {
  onEdit: () => void;
  onRemoveFromClass: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={tc('save')}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" />
          {t('editLesson')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onRemoveFromClass()}>
          {t('removeFromClass')}
        </DropdownMenuItem>
        <ConfirmDialog
          title={t('deleteLesson')}
          message={t('deleteLessonMsg')}
          onConfirm={onDelete}
          trigger={
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 className="size-4" />
              {t('deleteLesson')}
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
