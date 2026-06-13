'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const GRADE_KEYS = [
  'g1', 'g2', 'g3', 'g4', 'g5', 'g6',
  'g7', 'g8', 'g9', 'g10', 'g11', 'g12',
] as const;

/** Student grade dropdown (الأول → البكالوريا). Empty value allowed. */
export function GradeSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const tg = useTranslations('grades');
  const t = useTranslations('dashboard');
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('notSet')} />
      </SelectTrigger>
      <SelectContent>
        {GRADE_KEYS.map((g) => (
          <SelectItem key={g} value={g}>
            {tg(g)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Renders a grade key as its localized label (for tables/cards). */
export function GradeLabel({ grade }: { grade: string | null }) {
  const tg = useTranslations('grades');
  const t = useTranslations('dashboard');
  if (!grade) return <>{t('notSet')}</>;
  const known = (GRADE_KEYS as readonly string[]).includes(grade);
  return <>{known ? tg(grade) : grade}</>;
}
