import { useEffect, useState } from 'react';
import { resolvedScheme } from '@/shared/lib/theme';

/** Reads a CSS custom property, so charts follow the light/dark tokens in styles.css. */
export const cssVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * The colour scheme in effect. Re-renders when the system setting or the manual theme choice
 * (data-theme on <html>) changes, so charts and maps re-read their tokens.
 */
export const useColorScheme = (): 'light' | 'dark' => {
  const [scheme, setScheme] = useState<'light' | 'dark'>(resolvedScheme);

  useEffect(() => {
    const update = () => setScheme(resolvedScheme());
    const systemScheme = matchMedia('(prefers-color-scheme: dark)');
    systemScheme.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      systemScheme.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return scheme;
};
