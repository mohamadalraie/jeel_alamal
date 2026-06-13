'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { StudentNote } from '@/lib/types';
import { listNotes, addNote, updateNote, deleteNote, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';

/**
 * Student notes (spec 002). Full CRUD; each note shows its author and time.
 * This component is never rendered for a student actor — the API would 403,
 * and the student profile route is staff-only.
 */
export function StudentNotesCard({
  instituteId,
  studentId,
}: {
  instituteId: string;
  studentId: string;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [notes, setNotes] = useState<StudentNote[] | null>(null);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listNotes(instituteId, studentId).then(setNotes).catch(() => setNotes([]));
  }, [instituteId, studentId]);
  useEffect(refresh, [refresh]);

  async function add() {
    if (draft.trim().length < 1) return;
    setError(null);
    try {
      await addNote(instituteId, studentId, draft.trim());
      setDraft('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notes')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            placeholder={t('noteBody')}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button size="sm" disabled={draft.trim().length < 1} onClick={add}>
              <Plus data-icon="inline-start" />
              {t('addNote')}
            </Button>
          </div>
        </div>

        {notes === null ? (
          <p className="text-muted-foreground text-sm">{tc('loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noNotes')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.id} className="border-border rounded-lg border p-3">
                {editingId === n.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={editBody}
                      rows={2}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        {tc('cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await updateNote(instituteId, n.id, editBody.trim());
                          setEditingId(null);
                          refresh();
                        }}
                      >
                        {tc('save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between gap-2 text-xs">
                      <span>
                        {t('writtenBy')} {n.authorName} ·{' '}
                        {new Date(n.createdAt).toLocaleDateString(locale)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('edit')}
                          onClick={() => {
                            setEditingId(n.id);
                            setEditBody(n.body);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <ConfirmDialog
                          onConfirm={async () => {
                            await deleteNote(instituteId, n.id);
                            refresh();
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={t('delete')}>
                              <Trash2 className="text-destructive" />
                            </Button>
                          }
                        />
                      </span>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
