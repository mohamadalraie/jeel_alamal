'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePWA } from './use-pwa';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function PwaInstallBanner() {
  const t = useTranslations('pwa');
  const { canInstall, isIOS, isStandalone, isDismissed, promptInstall, dismissPrompt } = usePWA();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't render banner if app is already running in standalone mode or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  // If browser doesn't support PWA prompt and it's not iOS, don't display
  if (!canInstall && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const result = await promptInstall();
    setIsInstalling(false);

    if (result === 'ios') {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      {/* Mobile Bottom Install Sheet Banner */}
      <div className="fixed bottom-4 inset-x-3 z-50 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
        <div className="bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-4 text-card-foreground">
          {/* Top row: App header & Close button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-background shadow-md">
                <Image
                  src="/logo.png"
                  alt="جيل العمل"
                  fill
                  className="object-cover p-1"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-foreground leading-tight">
                    {t('installTitle')}
                  </h3>
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    تطبيق
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('installSubtitle')}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => dismissPrompt(7)}
              aria-label={t('dismiss')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
            <span className="bg-secondary/60 px-2 py-0.5 rounded-md flex items-center gap-1">
              {t('badgeFast')}
            </span>
            <span className="bg-secondary/60 px-2 py-0.5 rounded-md flex items-center gap-1">
              {t('badgeOffline')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-medium"
              onClick={() => dismissPrompt(7)}
            >
              {t('dismiss')}
            </Button>

            <Button
              size="sm"
              className="w-full text-xs font-bold gap-1.5 bg-[#123b50] hover:bg-[#123b50]/90 text-white shadow"
              onClick={handleInstallClick}
              disabled={isInstalling}
            >
              <Download className="w-3.5 h-3.5" />
              {isInstalling ? t('installing') : t('installButton')}
            </Button>
          </div>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="max-w-sm rounded-2xl p-5 text-center">
          <DialogHeader className="items-center text-center">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border bg-background p-1.5 mb-2 shadow-md">
              <Image src="/logo.png" alt="جيل العمل" fill className="object-contain" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {t('iosTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              اتبع الخطوات السريعة التالية لإضافة التطبيق إلى الشاشة الرئيسية لجهازك:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 text-start text-xs bg-muted/50 p-3.5 rounded-xl border border-border/50">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-background rounded-lg shadow-sm shrink-0 text-primary">
                <Share className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('iosStep1')}</p>
              </div>
            </div>

            <div className="border-t border-border/40 my-2" />

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-background rounded-lg shadow-sm shrink-0 text-primary">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('iosStep2')}</p>
              </div>
            </div>
          </div>

          <Button
            className="w-full font-bold bg-[#123b50] hover:bg-[#123b50]/90 text-white mt-1 gap-1"
            onClick={() => {
              setShowIosGuide(false);
              dismissPrompt(7);
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t('iosGotIt')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
