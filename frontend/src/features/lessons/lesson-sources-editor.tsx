'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, ImageIcon, Link2, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import type { LessonSourceInput, LessonSourceKind } from '@/lib/types';
import { uploadImage, uploadPdf } from '@/lib/api';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Editor for a lesson's sources: link | image | pdf, each with a description. */
export function LessonSourcesEditor({
  value,
  onChange,
}: {
  value: LessonSourceInput[];
  onChange: (sources: LessonSourceInput[]) => void;
}) {
  const t = useTranslations('lessons');

  const add = () => onChange([...value, { kind: 'link', url: '', description: '' }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const patch = (i: number, p: Partial<LessonSourceInput>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('sources')}</span>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus data-icon="inline-start" />
          {t('addSource')}
        </Button>
      </div>
      {value.map((s, i) => (
        <SourceRow
          key={i}
          source={s}
          onChange={(p) => patch(i, p)}
          onRemove={() => remove(i)}
        />
      ))}
    </div>
  );
}

const KIND_ICON = { link: Link2, image: ImageIcon, pdf: FileText } as const;

function SourceRow({
  source,
  onChange,
  onRemove,
}: {
  source: LessonSourceInput;
  onChange: (p: Partial<LessonSourceInput>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const Icon = KIND_ICON[source.kind];

  async function onPick(file: File) {
    setBusy(true);
    try {
      const { url } = source.kind === 'pdf' ? await uploadPdf(file) : await uploadImage(file);
      onChange({ url });
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const isUpload = source.kind === 'image' || source.kind === 'pdf';

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-2">
      <div className="flex items-center gap-1.5">
        <Select
          value={source.kind}
          onValueChange={(k) => onChange({ kind: k as LessonSourceKind, url: '' })}
        >
          <SelectTrigger className="h-8 w-24 shrink-0 px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="link">{t('sourceLink')}</SelectItem>
            <SelectItem value="image">{t('sourceImage')}</SelectItem>
            <SelectItem value="pdf">{t('sourcePdf')}</SelectItem>
          </SelectContent>
        </Select>

        {isUpload ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept={source.kind === 'pdf' ? 'application/pdf' : 'image/*'}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPick(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-0 flex-1"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Upload data-icon="inline-start" />
                  <span className="truncate">{source.url ? source.url.split('/').pop() : t('uploadFile')}</span>
                </>
              )}
            </Button>
            {source.url && <Icon className="text-primary size-4 shrink-0" />}
          </div>
        ) : (
          <Input
            dir="ltr"
            placeholder="https://…"
            value={source.url}
            onChange={(e) => onChange({ url: e.target.value })}
            className="h-8 min-w-0 flex-1 text-xs"
          />
        )}

        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={onRemove}>
          <Trash2 className="text-destructive size-3.5" />
        </Button>
      </div>
      <Input
        placeholder={t('sourceDescription')}
        value={source.description ?? ''}
        onChange={(e) => onChange({ description: e.target.value })}
        className="h-8 text-xs"
      />
    </div>
  );
}
