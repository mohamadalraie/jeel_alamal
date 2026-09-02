'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'pwa_install_dismissed_until';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true); // default true to avoid flash
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if running as Standalone PWA
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const isPwaQuery = new URLSearchParams(window.location.search).get('source') === 'pwa';

      const standaloneState = isStandaloneMedia || isNavStandalone || isAndroidApp || isPwaQuery;
      setIsStandalone(standaloneState);
      return standaloneState;
    };

    const inStandalone = checkStandalone();

    // 2. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIosDevice);

    // 3. Check snooze / dismissed status in localStorage
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil) {
      const untilDate = new Date(dismissedUntil);
      if (untilDate > new Date()) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }

    // 4. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA ServiceWorker registered with scope:', registration.scope);
        })
        .catch((err) => {
          console.warn('PWA ServiceWorker registration failed:', err);
        });
    }

    // 5. Listen to beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent automatic browser mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 6. Listen to appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger installation
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        return outcome;
      } catch (err) {
        console.error('Error triggering PWA prompt:', err);
        return 'unavailable';
      }
    } else if (isIOS) {
      return 'ios';
    }
    return 'unavailable';
  }, [deferredPrompt, isIOS]);

  // Snooze prompt for N days (default 7)
  const dismissPrompt = useCallback((days = 7) => {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + days);
    localStorage.setItem(STORAGE_KEY, expireDate.toISOString());
    setIsDismissed(true);
  }, []);

  const canInstall = Boolean(deferredPrompt || (isIOS && !isStandalone));

  return {
    canInstall,
    isIOS,
    isStandalone,
    isDismissed,
    isInstalled,
    promptInstall,
    dismissPrompt,
  };
}
