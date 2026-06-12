'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Institute } from '@/lib/types';
import { listInstitutes, createInstitute, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MemberFields, emptyMember, type MemberDraft } from './member-fields';

/** Super-admin home: all institutes + "create institute (with manager)". */
export function SuperAdminView() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [institutes, setInstitutes] = useState<Institute[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [manager, setManager] = useState<MemberDraft>(emptyMember());

  const refresh = useCallback(() => {
    listInstitutes().then(setInstitutes).catch(() => setInstitutes([]));
  }, []);
  useEffect(refresh, [refresh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createInstitute({
        name,
        place,
        description: description || undefined,
        manager,
      });
      setOpen(false);
      setName('');
      setPlace('');
      setDescription('');
      setManager(emptyMember());
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('institutes')}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus data-icon="inline-start" />
              {t('createInstitute')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('createInstitute')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="inst-name">{t('instituteName')}</Label>
                  <Input
                    id="inst-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="inst-place">{t('place')}</Label>
                  <Input
                    id="inst-place"
                    required
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="inst-desc">{t('description')}</Label>
                  <Input
                    id="inst-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <h3 className="border-border border-t pt-3 font-medium">
                {t('managerAccount')}
              </h3>
              <MemberFields value={manager} onChange={setManager} idPrefix="mgr" />
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? tc('loading') : tc('create')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {institutes === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : institutes.length === 0 ? (
        <p className="text-muted-foreground">{t('noInstitutes')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('instituteName')}</TableHead>
              <TableHead>{t('place')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutes.map((inst) => (
              <TableRow key={inst.id}>
                <TableCell className="font-medium">{inst.name}</TableCell>
                <TableCell>{inst.place}</TableCell>
                <TableCell>
                  {new Date(inst.createdAt).toLocaleDateString(locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
