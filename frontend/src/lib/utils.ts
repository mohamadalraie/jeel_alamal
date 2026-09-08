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

