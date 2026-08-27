import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'جيل العمل - منصة التميز المهني',
    short_name: 'جيل العمل',
    description: 'منصة جيل العمل للتأهيل والتدريب المهني',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#123b50',
    theme_color: '#123b50',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
