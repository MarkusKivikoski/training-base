/**
 * Manual light/dark choice. "auto" follows the operating system. The choice lives in
 * localStorage (this browser only) and is applied as `data-theme` on <html>, which the colour
 * tokens in styles.css read. index.html applies it before first paint, so there's no flash.
 */
export type ThemeChoice = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tb-theme';

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto'; // storage blocked: follow the system
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'auto') delete root.dataset['theme'];
  else root.dataset['theme'] = choice;
  try {
    if (choice === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Not remembered, but still applied for this visit.
  }
}

/** The scheme in effect: the manual choice, or the system's when on auto. */
export function resolvedScheme(): 'light' | 'dark' {
  const t = document.documentElement.dataset['theme'];
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
