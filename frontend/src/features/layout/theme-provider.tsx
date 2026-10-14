'use client';

import { ThemeProvider as NextThemes } from 'next-themes';
import { Direction } from 'radix-ui';

/**
 * Wraps next-themes and Radix Direction.Provider with the project's settings:
 * toggles the `.dark` class on <html>, and provides RTL/LTR context to all
 * Radix UI dropdowns, dialogs, popovers, and selects.
 */
export function ThemeProvider({
  children,
  dir = 'rtl',
}: {
  children: React.ReactNode;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <Direction.Provider dir={dir}>
      <NextThemes
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemes>
    </Direction.Provider>
  );
}
