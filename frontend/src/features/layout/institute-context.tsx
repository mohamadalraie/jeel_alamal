'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Institute, User } from '@/lib/types';
import { listInstitutes } from '@/lib/api';

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
 * Holds the authenticated user, their institutes, and the currently selected
 * one. The selection is persisted per user in localStorage (spec 001 FR-3) and
 * restored on next login. Consumed by the topbar picker and all staff pages.
 */
export function InstituteProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listInstitutes()
      .then((list) => {
        if (!active) return;
        setInstitutes(list);
        const saved = localStorage.getItem(storageKey(user.id));
        if (saved && list.some((i) => i.id === saved)) {
          setSelectedId(saved);
        } else if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user.id]);

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
      loading,
    }),
    [user, institutes, selectedId, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstitute(): InstituteContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInstitute must be used inside InstituteProvider');
  return ctx;
}
