import { toast } from 'sonner';
import { ApiError } from './api';

/** Thin wrappers so call sites get consistent success/error toasts (spec 006). */
export const notify = {
  success: (message: string) => toast.success(message),
  warning: (message: string) => toast.warning(message),
  error: (err: unknown, fallback?: string) => {
    if (typeof err === 'string') {
      return toast.error(err);
    }
    return toast.error(err instanceof ApiError ? err.message : (fallback ?? ''));
  },
};
