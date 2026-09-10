'use client';

import { useTranslations } from 'next-intl';
import {
  BookOpen,
  Calendar,
  Clock,
  User,
  BookMarked,
  Play,
  FileText,
  ImageIcon,
  Link2,
  ExternalLink,
  Info,
} from 'lucide-react';
import type { ProgramEntry, LessonSourceView } from '@/lib/types';
import { resolveAsset } from '@/lib/api';
import { formatTeacherName } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LessonStatusBadge } from './lesson-status-badge';
import { tint } from './lesson-colors';
import { Link } from '@/i18n/navigation';

const SOURCE_ICON = {
  link: Link2,
  image: ImageIcon,
  pdf: FileText,
} as const;

export function SourceLinkItem({ source, openLabel }: { source: LessonSourceView; openLabel: string }) {
  const Icon = SOURCE_ICON[source.kind];
  const href = resolveAsset(source.url) ?? source.url;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted transition text-xs font-medium"
    >
      <div className="flex items-center gap-2 truncate">
        <Icon className="size-4 text-primary shrink-0" />
        <span className="truncate">{source.description || openLabel}</span>
      </div>
      <ExternalLink className="size-3.5 shrink-0 opacity-60" />
    </a>
  );
}

export function LessonDetailsDialog({
  entry,
  open,
  onOpenChange,
  actions,
}: {
  entry: ProgramEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('lessons');

  if (!entry) return null;

  const isRecitation = entry.kind === 'recitation';
  const color = entry.category?.color;

  const actualMinutes =
    entry.actualStartTime && entry.actualEndTime
      ? Math.max(
          1,
          Math.ceil(
            (new Date(entry.actualEndTime).getTime() -
              new Date(entry.actualStartTime).getTime()) /
              60_000,
          ),
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 text-start">
          <div className="flex items-center justify-between gap-2 pr-6">
            {entry.category && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: tint(entry.category.color, 0.18), color: entry.category.color }}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.category.color }} />
                {entry.category.name}
              </span>
            )}
            <LessonStatusBadge status={entry.status} />
          </div>

          <DialogTitle className="text-xl font-bold flex items-start gap-2 leading-snug">
            {isRecitation ? (
              <BookMarked className="size-6 text-primary shrink-0 mt-0.5" />
            ) : (
              <BookOpen className="size-6 text-primary shrink-0 mt-0.5" />
            )}
            <span>{isRecitation ? t('recitation') : entry.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">{t('date')}</span>
                <span className="font-semibold">{entry.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">{t('expectedDuration')}</span>
                <span className="font-semibold">
                  {entry.expectedDurationMinutes != null
                    ? actualMinutes != null
                      ? t('durationActualExpected', {
                          actual: actualMinutes,
                          expected: entry.expectedDurationMinutes,
                        })
                      : t('durationMinutes', { n: entry.expectedDurationMinutes })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">{t('class')}</span>
                <span className="font-semibold">{entry.className}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[10px]">{t('teacher')}</span>
                <span className="font-semibold">{formatTeacherName(entry.teacher.name)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {!isRecitation && entry.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5" />
                <span>{t('description')}</span>
              </h4>
              <p className="text-sm bg-card p-3 rounded-lg border border-border/60 leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {entry.description}
              </p>
            </div>
          )}

          {/* Sources & Links */}
          {!isRecitation && entry.sources && entry.sources.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">{t('sources')}</h4>
              <div className="flex flex-col gap-2">
                {entry.sources.map((source, i) => (
                  <SourceLinkItem key={i} source={source} openLabel={t('open')} />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {actions && <div className="pt-2 border-t border-border/50 flex justify-end gap-2">{actions}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
