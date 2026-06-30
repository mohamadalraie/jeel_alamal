/**
 * Category colors are user-entered domain data (hex), so they are applied via
 * inline style (not Tailwind tokens). This helper picks a readable foreground
 * (black/white) for a given background so category chips stay legible in both
 * themes. Spec 008.
 */
export function readableOn(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length !== 3 && c.length !== 6) return '#000';
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Perceived luminance (sRGB) → light bg gets dark text and vice versa.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
}

/** A soft tinted background for a category (for card stripes / subtle fills). */
export function tint(hex: string, alpha = 0.14): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A small preset palette offered in the category color picker. */
export const CATEGORY_PALETTE = [
  '#BE9B5F', // gold (brand)
  '#123B50', // navy (brand)
  '#16A34A', // green
  '#2563EB', // blue
  '#DC2626', // red
  '#D97706', // amber
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#DB2777', // pink
  '#4B5563', // slate
];
