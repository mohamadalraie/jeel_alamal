'use client';

import { useTranslations } from 'next-intl';
import { TeacherLessonsView } from '@/features/lessons/teacher-lessons-view';

/** Teacher "دروسي" — their assigned lessons and next lesson (spec 008). */
export default function MyLessonsPage() {
  const t = useTranslations('lessons');
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t('myLessons')}</h1>
      <TeacherLessonsView />
    </div>
  );
}
