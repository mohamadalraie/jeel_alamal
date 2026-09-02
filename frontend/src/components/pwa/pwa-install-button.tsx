'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Smartphone, Download, Check } from 'lucide-react';
import { usePWA } from './use-pwa';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PwaInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
}

export function PwaInstallButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  showIcon = true,
}: PwaInstallButtonProps) {
  const t = useTranslations('pwa');
  const { canInstall, isIOS, isStandalone, isInstalled, promptInstall } = usePWA();
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isStandalone || isInstalled) {
    return null;
  }

  const handleClick = async () => {
    setIsInstalling(true);
    const result = await promptInstall();
    setIsInstalling(false);

    if (result === 'ios') {
      setShowIosModal(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`gap-2 text-xs font-semibold ${className}`}
        onClick={handleClick}
        disabled={isInstalling}
      >
        {showIcon && <Smartphone className="w-3.5 h-3.5 text-primary" />}
        <span>{t('installButton')}</span>
      </Button>

      {/* iOS Instructions Modal */}
      <Dialog open={showIosModal} onOpenChange={setShowIosModal}>
        <DialogContent className="max-w-sm rounded-2xl p-5 text-center">
          <DialogHeader className="items-center text-center">
            <Smartphone className="w-10 h-10 text-primary mb-1" />
            <DialogTitle className="text-lg font-bold">
              {t('iosTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              لإضافة التطبيق إلى الشاشة الرئيسية لجهاز iPhone أو iPad:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 my-3 text-start text-xs bg-muted/50 p-3 rounded-xl border border-border/50">
            <p className="font-medium text-foreground">{t('iosStep1')}</p>
            <p className="font-medium text-foreground">{t('iosStep2')}</p>
          </div>

          <Button
            className="w-full font-bold bg-[#123b50] text-white"
            onClick={() => setShowIosModal(false)}
          >
            <Check className="w-4 h-4 me-1" />
            {t('iosGotIt')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
