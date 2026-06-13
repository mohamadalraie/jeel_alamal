'use client';

import { ThemeProvider as NextThemes } from 'next-themes';

/**
 * Wraps next-themes with the project's settings: toggles the `.dark` class on
 * <html> (matching our Tailwind dark variant), respects the OS preference by
 * default, and avoids the flash of the wrong theme on load.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
