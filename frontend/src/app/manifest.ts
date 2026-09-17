import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'جيل الأمل - المنصّة التعليمية',
    short_name: 'جيل الأمل',
    description: 'منصة جيل الأمل لإدارة المعاهد والتعليم القرآني والتربوي',
    start_url: '/?source=pwa',
    scope: '/',
    id: 'jeel-alamal-pwa',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#123b50',
    theme_color: '#123b50',
    dir: 'rtl',
    lang: 'ar',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'الرئيسية',
        short_name: 'الرئيسية',
        description: 'الانتقال للوحة التحكم الرئيسية',
        url: '/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    screenshots: [
      {
        src: '/hero-bg.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'لوحة تحكم جيل الأمل',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'تطبيق جيل الأمل للجوال',
      },
    ],
  };
}
