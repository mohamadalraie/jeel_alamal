'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GradeSelect } from '@/features/shared/grade-select';

/**
 * Shared person-account fields (spec 001): used for the manager inside
 * "create institute", for teachers, and for students (with school grade).
 * One component — never duplicated (constitution V).
 */
export interface MemberDraft {
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  username: string;
  password: string;
  schoolGrade?: string;
}

export const emptyMember = (): MemberDraft => ({
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  username: '',
  password: '',
});

// Phone: optional +, 7–15 digits (mirrors the backend rule).
const PHONE_PATTERN = '\\+?[0-9]{7,15}';

export function MemberFields({
  value,
  onChange,
  withSchoolGrade = false,
  idPrefix,
}: {
  value: MemberDraft;
  onChange: (next: MemberDraft) => void;
  withSchoolGrade?: boolean;
  idPrefix: string;
}) {
  const t = useTranslations('dashboard');
  const set = (patch: Partial<MemberDraft>) => onChange({ ...value, ...patch });
  // Birth date cannot be in the future.
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-firstName`}>{t('firstName')}</Label>
        <Input
          id={`${idPrefix}-firstName`}
          required
          value={value.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-lastName`}>{t('lastName')}</Label>
        <Input
          id={`${idPrefix}-lastName`}
          required
          value={value.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-birthDate`}>{t('birthDate')}</Label>
        <Input
          id={`${idPrefix}-birthDate`}
          type="date"
          required
          max={todayIso}
          value={value.birthDate}
          onChange={(e) => set({ birthDate: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>{t('phone')}</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          dir="ltr"
          required
          pattern={PHONE_PATTERN}
          title="7–15 digits, optionally starting with +"
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
      </div>
      {withSchoolGrade && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-schoolGrade`}>{t('schoolGrade')}</Label>
          <GradeSelect
            id={`${idPrefix}-schoolGrade`}
            value={value.schoolGrade ?? ''}
            onChange={(v) => set({ schoolGrade: v })}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-username`}>{t('username')}</Label>
        <Input
          id={`${idPrefix}-username`}
          dir="ltr"
          required
          minLength={3}
          value={value.username}
          onChange={(e) => set({ username: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-password`}>{t('password')}</Label>
        <Input
          id={`${idPrefix}-password`}
          type="password"
          dir="ltr"
          required
          minLength={8}
          value={value.password}
          onChange={(e) => set({ password: e.target.value })}
        />
      </div>
    </div>
  );
}
