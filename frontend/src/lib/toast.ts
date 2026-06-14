import { toast } from 'sonner';
import { ApiError } from './api';

/** Thin wrappers so call sites get consistent success/error toasts (spec 006). */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (err: unknown, fallback: string) =>
    toast.error(err instanceof ApiError ? err.message : fallback),
};
