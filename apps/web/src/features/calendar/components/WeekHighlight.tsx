import { useEffect, useRef } from 'react';

/**
 * A ring that flashes over its (relatively positioned) parent and fades out, after scrolling
 * the parent into view. Marks the week opened from another page.
 */
export const WeekHighlight = () => {
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    overlay.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  return (
    <div
      ref={overlay}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 animate-flash-fade rounded-[inherit] bg-series-1/10 ring-2 ring-series-1 ring-inset"
    />
  );
};
