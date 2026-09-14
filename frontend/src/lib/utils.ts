import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTeacherName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('الأستاذ') ||
    trimmed.startsWith('الاستاذ') ||
    trimmed.startsWith('الشيخ') ||
    trimmed.startsWith('أ.') ||
    trimmed.startsWith('د.')
  ) {
    return trimmed;
  }
  return `الأستاذ ${trimmed}`;
}

/**
 * Ensures Arabic date formatting uses Levant/Mashriqi month names (كانون، شباط، آذار، نيسان، أيار، حزيران، تموز، آب، أيلول، تشرين...).
 */
export function formatDateLocale(locale: string = 'ar'): string {
  if (!locale || locale === 'ar' || locale.startsWith('ar')) {
    return 'ar-SY-u-nu-latn';
  }
  return locale;
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'ar',
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(formatDateLocale(locale), options);
}

