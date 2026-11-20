import { shiftMonth } from '@app/metrics';
import { useEffect } from 'react';

/** ← and → change the month (not while typing in a field, and not with a modifier key). */
export const useMonthArrowKeys = (month: string | undefined, onChange: (month: string) => void) => {
  useEffect(() => {
    if (!month) return;

    const onKey = (event: KeyboardEvent) => {
      const isTyping = event.target instanceof HTMLInputElement;
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
      if (isTyping || hasModifier) return;
      if (event.key === 'ArrowLeft') onChange(shiftMonth(month, -1));
      if (event.key === 'ArrowRight') onChange(shiftMonth(month, 1));
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [month, onChange]);
};
