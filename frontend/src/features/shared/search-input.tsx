'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';

/** Controlled search box with a leading icon (spec 006). RTL-safe (ps-9). */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const t = useTranslations('dashboard');
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('search')}
        className="ps-9"
      />
    </div>
  );
}
