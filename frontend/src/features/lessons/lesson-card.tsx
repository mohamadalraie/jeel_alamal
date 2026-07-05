'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, Clock, ExternalLink, FileText, ImageIcon, Link2 } from 'lucide-react';
import type { ProgramEntry, LessonSourceView } from '@/lib/types';
import { resolveAsset } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { tint } from './lesson-colors';
import { LessonStatusBadge } from './lesson-status-badge';

const SOURCE_ICON = {
  link: Link2,
  image: ImageIcon,
  pdf: FileText,
} as const;

/**
 * One program entry. Normal lessons show name + category + teacher + sources;
 * recitation entries show the fixed "تسميع القرآن الكريم" label. `actions` and
 * `meta` slots let callers add controls without forking the card (constitution V).
 */
export function LessonCard({
  entry,
  showTeacher = false,
  showClass = false,
  showStatus = true,
  index = 0,
  actions,
}: {
  entry: ProgramEntry;
  showTeacher?: boolean;
  showClass?: boolean;
  /** Show the lifecycle status badge (spec 009). */
  showStatus?: boolean;
  /** Lesson number within the day (0 = don't show). */
  index?: number;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('lessons');
  const isRecitation = entry.kind === 'recitation';
  const color = entry.category?.color;
  // Actual delivered minutes (shown once a lesson has been ended).
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
    <div
      className="border-border bg-card flex items-stretch gap-0 overflow-hidden rounded-lg border"
      style={color ? { borderInlineStartColor: color, borderInlineStartWidth: 4 } : undefined}
    >
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 font-semibold">
            {index > 0 && (
              <span className="text-muted-foreground text-xs font-medium">{index}.</span>
            )}
            <BookOpen className="text-primary size-4 shrink-0" />
            {isRecitation ? t('recitation') : entry.name}
          </span>
          {actions}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {showStatus && <LessonStatusBadge status={entry.status} />}
          {entry.category && (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: tint(entry.category.color, 0.18), color: entry.category.color }}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.category.color }} />
              {entry.category.name}
            </span>
          )}
          {entry.expectedDurationMinutes != null && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              {actualMinutes != null
                ? t('durationActualExpected', {
                    actual: actualMinutes,
                    expected: entry.expectedDurationMinutes,
                  })
                : t('durationMinutes', { n: entry.expectedDurationMinutes })}
            </span>
          )}
          {showClass && <Badge variant="outline">{entry.className}</Badge>}
          {showTeacher && (
            <span className="text-muted-foreground text-xs">{entry.teacher.name}</span>
          )}
        </div>

        {!isRecitation && entry.description && (
          <p className="text-muted-foreground text-sm">{entry.description}</p>
        )}

        {!isRecitation && entry.sources.length > 0 && (
          <div className="mt-0.5 flex flex-col gap-1">
            {entry.sources.map((s, i) => (
              <SourceLink key={i} source={s} openLabel={t('open')} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceLink({ source, openLabel }: { source: LessonSourceView; openLabel: string }) {
  const Icon = SOURCE_ICON[source.kind];
  const href = resolveAsset(source.url) ?? source.url;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:bg-muted flex items-center gap-1.5 rounded px-1.5 py-1 text-xs"
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{source.description || openLabel}</span>
      <ExternalLink className="size-3 shrink-0 opacity-60" />
    </a>
  );
}
