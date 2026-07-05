'use client';

import { use } from 'react';
import { LessonTimerPage } from '@/features/lessons/lesson-timer-page';

/**
 * Teacher live lesson timer (spec 009). Access is enforced server-side — only
 * the teacher assigned to this binding can read/start/end it.
 */
export default function LessonTimerRoute({
  params,
}: {
  params: Promise<{ lessonClassId: string }>;
}) {
  const { lessonClassId } = use(params);
  return <LessonTimerPage lessonClassId={lessonClassId} />;
}
