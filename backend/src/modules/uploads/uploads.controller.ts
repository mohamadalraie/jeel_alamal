import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './uploads.config';

const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Generic authenticated image upload (spec 003). Stores the file on the
 * uploads volume and returns a relative `/uploads/...` URL that the frontend
 * resolves against the API origin. Any authenticated staff may upload.
 */
@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          ),
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ok = ALLOWED.includes(extname(file.originalname).toLowerCase());
        cb(
          ok ? null : new BadRequestException('Only image files are allowed'),
          ok,
        );
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return { url: `${UPLOADS_URL_PREFIX}/${file.filename}` };
  }

  /** PDF upload for lesson sources (spec 008). */
  @Post('pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          ),
      }),
      limits: { fileSize: PDF_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ok = extname(file.originalname).toLowerCase() === '.pdf';
        cb(
          ok ? null : new BadRequestException('Only PDF files are allowed'),
          ok,
        );
      },
    }),
  )
  uploadPdf(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return { url: `${UPLOADS_URL_PREFIX}/${file.filename}` };
  }
}
