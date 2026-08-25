'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import {
  deleteLesson,
  removeLessonClass,
  setClassLessonsVisibility,
} from '@/lib/api';
import { useClassLessons, useLessonCategories, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSkeleton } from '@/features/shared/skeletons';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { useInstitute } from '@/features/layout/institute-context';
import { LessonProgramList } from './lesson-program-list';
import { LessonTimerActions } from './lesson-timer-actions';
import { AddLessonDialog, type LessonEditing } from './add-lesson-dialog';
import { CategoryManager } from './category-manager';

/**
 * Class Lessons tab (spec 008/009): the class program grouped by month/day —
 * matching the manager الدروس view. Managers can add/edit/delete lessons, manage
 * categories, and toggle student visibility; the assigned teacher gets a
 * start/resume control on their own lessons.
 */
export function LessonProgram({
  classId,
  instituteId,
  canManage,
}: {
  classId: string;
  instituteId: string;
  canManage: boolean;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const { user } = useInstitute();
  const { data, isLoading } = useClassLessons(classId);
  const { data: categories = [] } = useLessonCategories(instituteId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonEditing | null>(null);
  const [presetDate, setPresetDate] = useState<string>();

  const refresh = () => qc.invalidateQueries({ queryKey: qk.classLessons(classId) });
  const refreshAll = () => {
    refresh();
    qc.invalidateQueries({ queryKey: qk.classProfile(classId) });
  };

  const openCreate = (ymd?: string) => {
    setEditing(null);
    setPresetDate(ymd);
    setDialogOpen(true);
  };
  const openEdit = (e: ProgramEntry) => {
    setEditing({
      lessonId: e.lessonId,
      kind: e.kind,
      name: e.name,
      description: e.description,
      categoryId: e.category?.id ?? null,
      date: e.date,
      expectedDurationMinutes: e.expectedDurationMinutes,
      sources: e.sources.map((s) => ({
        kind: s.kind,
        url: s.url,
        description: s.description ?? undefined,
      })),
    });
    setPresetDate(undefined);
    setDialogOpen(true);
  };

  async function toggleVisibility() {
    try {
      await setClassLessonsVisibility(classId, !data!.lessonsVisibleToStudents);
      refreshAll();
    } catch (err) {
      notify.error(err, tc('error'));
    }
  }

  if (isLoading || !data) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar (manager) */}
      {canManage && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CategoryManager instituteId={instituteId} />
          <Button size="sm" onClick={() => openCreate()}>
            <Plus data-icon="inline-start" />
            {t('addLesson')}
          </Button>
        </div>
      )}

      {/* Student visibility toggle (manager) */}
      {canManage && (
        <button
          type="button"
          onClick={toggleVisibility}
          className="border-border hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition"
        >
          <span className="flex flex-col">
            <span className="text-sm font-medium">{t('studentVisibility')}</span>
            <span className="text-muted-foreground text-xs">{t('studentVisibilityHint')}</span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${data.lessonsVisibleToStudents ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${data.lessonsVisibleToStudents ? 'start-[1.375rem]' : 'start-0.5'}`}
            />
          </span>
        </button>
      )}

      {/* Program list */}
      <LessonProgramList
        entries={data.entries}
        emptyText={t('noLessons')}
        showTeacher
        onAddDay={canManage ? (ymd) => openCreate(ymd) : undefined}
        renderActions={(e) => {
          const canStart = user.id === e.teacher.id;
          if (!canStart && !canManage) return null;
          return (
            <div className="flex items-center gap-1.5">
              {canStart && <LessonTimerActions entry={e} />}
              {canManage && (
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
            </div>
          );
        }}
      />

      {canManage && (
        <AddLessonDialog
          instituteId={instituteId}
          categories={categories}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onDone={refresh}
          preselectClassId={classId}
          preselectDate={presetDate}
          editing={editing}
        />
      )}
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
