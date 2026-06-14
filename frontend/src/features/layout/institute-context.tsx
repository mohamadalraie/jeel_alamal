'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Institute, User } from '@/lib/types';
import { useInstitutes } from '@/lib/queries';

interface InstituteContextValue {
  user: User;
  institutes: Institute[];
  selected: Institute | null;
  selectInstitute: (id: string) => void;
  loading: boolean;
}

const Ctx = createContext<InstituteContextValue | null>(null);

const storageKey = (userId: string) => `jeel.institute.${userId}`;

/**
 * Holds the authenticated user, their institutes (via React Query so mutations
 * elsewhere refresh the topbar), and the currently selected one — persisted per
 * user in localStorage (spec 001 FR-3, refactored for spec 006).
 */
export function InstituteProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const { data: institutes = [], isLoading } = useInstitutes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (institutes.length === 0) return;
    setSelectedId((current) => {
      if (current && institutes.some((i) => i.id === current)) return current;
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem(storageKey(user.id))
          : null;
      if (saved && institutes.some((i) => i.id === saved)) return saved;
      return institutes[0].id;
    });
  }, [institutes, user.id]);

  function selectInstitute(id: string) {
    setSelectedId(id);
    localStorage.setItem(storageKey(user.id), id);
  }

  const value = useMemo<InstituteContextValue>(
    () => ({
      user,
      institutes,
      selected: institutes.find((i) => i.id === selectedId) ?? null,
      selectInstitute,
      loading: isLoading,
    }),
    [user, institutes, selectedId, isLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstitute(): InstituteContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInstitute must be used inside InstituteProvider');
  return ctx;
}
