import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`. We export next-intl's
 * locale-routing handler under the new `proxy` name so the deprecation warning is
 * avoided while keeping next-intl's behaviour (locale detection + prefixing).
 */
export const proxy = createMiddleware(routing);

export const config = {
  // Run on everything except API routes, Next internals, and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
