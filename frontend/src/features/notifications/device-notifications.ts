/**
 * Native Device Notifications Helper (PWA / Browser Web Notifications)
 */

import { apiFetch } from '@/lib/api';

const SHOWN_NOTIFICATIONS_KEY = 'jeel_shown_notifications_v1';

function getShownNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveShownNotificationId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const set = getShownNotificationIds();
    set.add(id);
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register background Web Push subscription with NestJS backend
 */
export async function registerPushSubscription() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }

  const vapidKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BNpLIXaj8bbNnX3nkMgqP3Ma1_v6emPFQRwbkJ0nUHGjWngmlz2efBDvQX1beHwZ58PC5n8PYqL9dRSUlrvczzg';

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    if (subscription) {
      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys) {
        await apiFetch('/notifications/push-subscription', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          }),
        });
      }
    }
  } catch (err) {
    console.warn('Register push subscription failed:', err);
  }
}

/**
 * Request notification permission from browser & register push
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    await registerPushSubscription();
    return 'granted';
  }
  if (Notification.permission !== 'denied') {
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        await registerPushSubscription();
      }
      return res;
    } catch {
      return 'denied';
    }
  }
  return Notification.permission;
}

/**
 * Display native OS/browser notification for new item
 */
export async function triggerNativeNotification(item: {
  id: string;
  title: string;
  message: string;
  link?: string | null;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const shownSet = getShownNotificationIds();
  if (shownSet.has(item.id)) return; // Already notified on device

  saveShownNotificationId(item.id);

  const title = item.title || 'إشعار جديد';
  const options: NotificationOptions = {
    body: item.message,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: item.id,
    data: { url: item.link || '/' },
    dir: 'rtl',
    lang: 'ar',
  };

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch {
      // Fallback
    }
  }

  try {
    const notif = new Notification(title, options);
    notif.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (item.link) {
        window.location.href = item.link;
      }
      notif.close();
    };
  } catch (err) {
    console.warn('Native notification trigger failed:', err);
  }
}
