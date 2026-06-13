'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus } from 'lucide-react';
import { uploadImage, resolveAsset, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

/**
 * Image picker that uploads to the backend and reports the stored URL.
 * Shows a live preview. Reused for institute logos (spec 003).
 */
export function LogoUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string) => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const preview = resolveAsset(value);

  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted ring-border grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl ring-1">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t('logo')} className="size-full object-cover" />
        ) : (
          <ImagePlus className="text-muted-foreground size-6" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t('uploading') : t('uploadLogo')}
        </Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
