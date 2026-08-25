'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { LessonBindingStatus } from '@/lib/types';
import { tint } from './lesson-colors';

/**
 * Lesson delivery status colors (spec 009), centralized like attendance-colors.
 * Applied via the shared `tint` helper as a soft badge fill so the label stays
 * legible in both themes. `pending` is neutral so it doesn't draw the eye.
 */
const STATUS_COLOR: Record<LessonBindingStatus, string | null> = {
  pending: null, // neutral — rendered as a muted outline badge
  started: '#2563EB', // blue — in progress
  finished: '#16A34A', // green — completed on time
  not_given: '#DC2626', // red — skipped
  over_time: '#D97706', // amber — ran long
  under_time: '#0891B2', // cyan — ran short
};

/** Raw status color (or null for the neutral `pending` state) — for dots/accents. */
export function statusColor(status: LessonBindingStatus): string | null {
  return STATUS_COLOR[status];
}

/** A colored pill showing a binding's lifecycle status. */
export function LessonStatusBadge({
  status,
  className,
}: {
  status: LessonBindingStatus;
  className?: string;
}) {
  const t = useTranslations('lessons');
  const label = t(`status_${status}`);
  const color = STATUS_COLOR[status];

  if (!color) {
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={className}
      style={{ backgroundColor: tint(color, 0.16), color, borderColor: tint(color, 0.3) }}
    >
      {label}
    </Badge>
  );
}
