import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Produces a minimal standalone server for small production Docker images.
  output: 'standalone',
  // Allow phones/tablets on the LAN to load dev resources (HMR, client bundles).
  // Without this, Next.js 16 blocks cross-origin dev requests and the page loads
  // but never hydrates, so nothing is interactive.
  allowedDevOrigins: ['192.168.1.106'],
};

export default withNextIntl(nextConfig);
