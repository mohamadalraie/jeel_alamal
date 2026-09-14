/**
 * Native Device Notifications Helper (PWA / Browser Web Notifications)
 */

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

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission !== 'denied') {
    try {
      const res = await Notification.requestPermission();
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

  // Try service worker showNotification first (better for mobile PWA & background OS notifications)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    } catch {
      // Fallback to Window Notification
    }
  }

  // Fallback to Standard Notification constructor
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
