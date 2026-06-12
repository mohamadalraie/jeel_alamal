import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Produces a minimal standalone server for small production Docker images.
  output: 'standalone',
};

export default withNextIntl(nextConfig);
