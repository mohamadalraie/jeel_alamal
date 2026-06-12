'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Institute, User } from '@/lib/types';
import { listInstitutes } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembersTab } from './members-tab';
import { ClassesTab } from './classes-tab';

/** The chosen institute is remembered per user (spec 001 FR-3). */
const storageKey = (userId: string) => `jeel.institute.${userId}`;

/**
 * Manager home: pick one of the assigned institutes (persisted in
 * localStorage), then manage its teachers, students, and classes.
 */
export function ManagerView({ user }: { user: User }) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [institutes, setInstitutes] = useState<Institute[] | null>(null);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    listInstitutes()
      .then((list) => {
        setInstitutes(list);
        const saved = localStorage.getItem(storageKey(user.id));
        // Restore the saved choice when it is still one of the assigned
        // institutes; otherwise default to the first.
        if (saved && list.some((i) => i.id === saved)) {
          setSelected(saved);
        } else if (list.length > 0) {
          setSelected(list[0].id);
        }
      })
      .catch(() => setInstitutes([]));
  }, [user.id]);

  function choose(id: string) {
    setSelected(id);
    localStorage.setItem(storageKey(user.id), id);
  }

  if (institutes === null) {
    return <p className="text-muted-foreground">{tc('loading')}</p>;
  }
  if (institutes.length === 0) {
    return <p className="text-muted-foreground">{t('noInstitutes')}</p>;
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-sm">
          {t('selectInstitute')}
        </span>
        <Select value={selected} onValueChange={choose}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder={t('selectInstitute')} />
          </SelectTrigger>
          <SelectContent>
            {institutes.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.name} — {inst.place}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <Tabs defaultValue="teachers" key={selected}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="teachers">{t('teachers')}</TabsTrigger>
            <TabsTrigger value="students">{t('students')}</TabsTrigger>
            <TabsTrigger value="classes">{t('classes')}</TabsTrigger>
          </TabsList>
          <TabsContent value="teachers" className="pt-3">
            <MembersTab instituteId={selected} role="teacher" />
          </TabsContent>
          <TabsContent value="students" className="pt-3">
            <MembersTab instituteId={selected} role="student" />
          </TabsContent>
          <TabsContent value="classes" className="pt-3">
            <ClassesTab instituteId={selected} />
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
