'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { login, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
      setBusy(false);
    }
  }

  return (
    <div className="w-full z-10 flex flex-col items-center">
      <div className="text-center mb-3">
        <h2 className="text-2xl font-bold text-white drop-shadow-md">{t('loginTitle')}</h2>
        <p className="text-white/70 text-xs mt-1">{t('loginSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="w-full flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username" className="text-white/90 text-sm font-medium">{t('username')}</Label>
          <Input
            id="username"
            autoComplete="username"
            dir="ltr"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-[#e8c37d] focus:ring-[#e8c37d]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-white/90 text-sm font-medium">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-[#e8c37d] focus:ring-[#e8c37d]"
          />
        </div>

        {error && (
          <p role="alert" className="text-rose-300 bg-rose-500/20 border border-rose-500/30 rounded-lg p-2.5 text-xs text-center">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="h-13 w-full rounded-2xl text-base mt-2 shadow-xl hover:shadow-2xl transition-all border border-white/10 bg-gradient-to-r from-[#e8c37d] to-[#d4b06b] hover:from-[#d4b06b] hover:to-[#c29e5a] text-[#123b50] font-bold"
        >
          {busy ? t('loggingIn') : t('loginButton')}
        </Button>
      </form>
    </div>
  );
}
