'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Pencil, Building2 } from 'lucide-react';
import type { Institute } from '@/lib/types';
import {
  listInstitutes,
  createInstitute,
  updateInstitute,
  resolveAsset,
  ApiError,
} from '@/lib/api';
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
} from '@/components/ui/dialog';
import { LogoUpload } from '@/features/shared/logo-upload';
import { MemberFields, emptyMember, type MemberDraft } from './member-fields';

/** Super-admin home: institutes list, create (with manager + logo), and edit. */
export function SuperAdminView() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [institutes, setInstitutes] = useState<Institute[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Institute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [manager, setManager] = useState<MemberDraft>(emptyMember());

  const refresh = useCallback(() => {
    listInstitutes().then(setInstitutes).catch(() => setInstitutes([]));
  }, []);
  useEffect(refresh, [refresh]);

  function resetCreate() {
    setName('');
    setPlace('');
    setDescription('');
    setLogoUrl('');
    setManager(emptyMember());
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createInstitute({
        name,
        place,
        description: description || undefined,
        logoUrl: logoUrl || undefined,
        manager,
      });
      setCreateOpen(false);
      resetCreate();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function onEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await updateInstitute(editing.id, {
        name: editing.name,
        place: editing.place,
        description: editing.description ?? undefined,
        logoUrl: editing.logoUrl ?? undefined,
      });
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('institutes')}</h1>
        <Button onClick={() => { resetCreate(); setError(null); setCreateOpen(true); }}>
          <Plus data-icon="inline-start" />
          {t('createInstitute')}
        </Button>
      </div>

      {institutes === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : institutes.length === 0 ? (
        <p className="text-muted-foreground">{t('noInstitutes')}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('logo')}</TableHead>
                <TableHead>{t('instituteName')}</TableHead>
                <TableHead>{t('place')}</TableHead>
                <TableHead>{t('createdAt')}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutes.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>
                    <InstituteLogo institute={inst} />
                  </TableCell>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>{inst.place}</TableCell>
                  <TableCell>
                    {new Date(inst.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('editInstitute')}
                      onClick={() => { setError(null); setEditing({ ...inst }); }}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('createInstitute')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('logo')}</Label>
              <LogoUpload value={logoUrl} onChange={setLogoUrl} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inst-name">{t('instituteName')}</Label>
                <Input id="inst-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inst-place">{t('place')}</Label>
                <Input id="inst-place" required value={place} onChange={(e) => setPlace(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="inst-desc">{t('description')}</Label>
                <Input id="inst-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <h3 className="border-border border-t pt-3 font-medium">{t('managerAccount')}</h3>
            <MemberFields value={manager} onChange={setManager} idPrefix="mgr" />
            {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? tc('loading') : tc('create')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editInstitute')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('logo')}</Label>
                <LogoUpload
                  value={editing.logoUrl}
                  onChange={(url) => setEditing({ ...editing, logoUrl: url })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name">{t('instituteName')}</Label>
                <Input
                  id="edit-name"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-place">{t('place')}</Label>
                <Input
                  id="edit-place"
                  required
                  value={editing.place}
                  onChange={(e) => setEditing({ ...editing, place: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-desc">{t('description')}</Label>
                <Input
                  id="edit-desc"
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? tc('loading') : tc('save')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InstituteLogo({ institute }: { institute: Institute }) {
  const src = resolveAsset(institute.logoUrl);
  return (
    <div className="bg-muted ring-border grid size-9 place-items-center overflow-hidden rounded-lg ring-1">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={institute.name} className="size-full object-cover" />
      ) : (
        <Building2 className="text-muted-foreground size-4" />
      )}
    </div>
  );
}
