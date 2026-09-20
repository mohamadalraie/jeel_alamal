/**
 * Native Device Notifications Helper (PWA / Browser Web Notifications)
 *
 * HOW BACKGROUND PUSH WORKS:
 * 1. Browser registers a ServiceWorker (sw.js)
 * 2. Browser creates a PushSubscription via PushManager (tied to the SW)
 * 3. We send that subscription to the backend, which stores it
 * 4. When the backend calls webpush.sendNotification(), the browser's push
 *    service (FCM for Chrome, APNs for Safari) delivers the message to the SW
 *    even when the app is CLOSED.
 * 5. The SW's 'push' event fires and calls showNotification()
 *
 * For this to work the SW must be installed AND the subscription must be
 * freshly registered with the current VAPID key.
 */

import { apiFetch } from '@/lib/api';

const SHOWN_NOTIFICATIONS_KEY = 'jeel_shown_notifications_v1';
const PUSH_REGISTERED_KEY = 'jeel_push_registered_at';

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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidKey(): Promise<string> {
  const fallback =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BNpLIXaj8bbNnX3nkMgqP3Ma1_v6emPFQRwbkJ0nUHGjWngmlz2efBDvQX1beHwZ58PC5n8PYqL9dRSUlrvczzg';
  try {
    const res = await apiFetch<{ publicKey: string }>('/notifications/vapid-public-key');
    return res?.publicKey || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Ensure the ServiceWorker is installed and active.
 * Returns the ServiceWorkerRegistration or null on failure.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    try {
      await reg.update();
    } catch {
      // ignore update errors (e.g. offline)
    }
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('[Push] ServiceWorker setup failed:', err);
    return null;
  }
}

/**
 * Register background Web Push subscription with NestJS backend.
 * Safe to call multiple times — will re-subscribe only when needed.
 */
export async function registerPushSubscription(forceResubscribe = false): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    console.info('[Push] PushManager not available on this browser/OS');
    return false;
  }
  if (Notification.permission !== 'granted') {
    console.info('[Push] Notification permission not granted yet');
    return false;
  }

  try {
    // Step 1: Ensure SW is ready
    const reg = await ensureServiceWorker();
    if (!reg) {
      console.warn('[Push] Could not get a ready ServiceWorker');
      return false;
    }

    // Step 2: Get VAPID public key from backend
    const vapidKey = await fetchVapidKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    // Step 3: Check existing subscription
    let subscription = await reg.pushManager.getSubscription();

    if (subscription && forceResubscribe) {
      console.info('[Push] Forcing resubscription...');
      try {
        await subscription.unsubscribe();
      } catch {}
      subscription = null;
    }

    // Step 4: If subscription exists, validate it against current VAPID key
    if (subscription) {
      try {
        const existingKeyRaw = subscription.options?.applicationServerKey;
        if (existingKeyRaw) {
          const existingKeyArray = new Uint8Array(
            existingKeyRaw instanceof ArrayBuffer
              ? existingKeyRaw
              : (existingKeyRaw as ArrayBufferView).buffer
          );
          const matches =
            existingKeyArray.length === applicationServerKey.length &&
            existingKeyArray.every((v, i) => v === applicationServerKey[i]);
          if (!matches) {
            console.info('[Push] VAPID key mismatch detected, unsubscribing...');
            await subscription.unsubscribe();
            subscription = null;
          }
        }
      } catch (err) {
        console.warn('[Push] Key validation error, renewing subscription:', err);
        if (subscription) {
          try {
            await subscription.unsubscribe();
          } catch {}
        }
        subscription = null;
      }
    }

    // Step 5: Create new subscription if none valid
    if (!subscription) {
      console.info('[Push] Creating new push subscription...');
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
      console.info('[Push] Push subscription created:', subscription.endpoint.slice(-30));
    }

    // Step 6: Send to backend
    const subJson = subscription.toJSON();
    if (subJson.endpoint && subJson.keys) {
      await apiFetch('/notifications/push-subscription', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });
      localStorage.setItem(PUSH_REGISTERED_KEY, new Date().toISOString());
      console.info('[Push] Subscription saved to backend ✅');
      return true;
    }
  } catch (err) {
    console.error('[Push] registerPushSubscription failed:', err);
  }
  return false;
}

/**
 * Send a test background Web Push notification to the current user.
 */
export async function sendTestPushNotification(): Promise<boolean> {
  try {
    const ok = await registerPushSubscription(true); // ensure fresh subscription
    if (!ok) return false;
    await apiFetch('/notifications/test', { method: 'POST' });
    return true;
  } catch (err) {
    console.error('[Push] sendTestPushNotification failed:', err);
    return false;
  }
}

/**
 * Request notification permission from browser & register push.
 * Shows the permission dialog if not yet decided.
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
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
 * Show an OS-level notification for an already-received item.
 * Used for in-app polling fallback (when push didn't arrive).
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
  if (shownSet.has(item.id)) return;
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
      if (reg?.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch {
      // Fallback to Notification constructor
    }
  }

  try {
    const notif = new Notification(title, options);
    notif.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (item.link) window.location.href = item.link;
      notif.close();
    };
  } catch (err) {
    console.warn('[Push] Native notification trigger failed:', err);
  }
}
