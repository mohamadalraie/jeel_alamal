import { join } from 'node:path';

/**
 * Directory where uploaded files are written. In Docker this is a mounted
 * volume (UPLOADS_DIR=/app/uploads); locally it defaults to ./uploads.
 * Files are served read-only at the `/uploads` URL prefix (see main.ts).
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

export const UPLOADS_URL_PREFIX = '/uploads';
