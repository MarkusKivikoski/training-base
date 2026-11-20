import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

/** Space kept between the tip and the edge of the window, in pixels. */
const EDGE_GAP_PX = 8;

type InfoTipProps = {
  /** What the tip explains, for the button's accessible name ("About Fitness (CTL)"). */
  label: string;
  children: ReactNode;
};

/**
 * A small "?" button with an explanation. It opens on hover, on keyboard focus and on tap, and
 * Escape closes it. Screen readers get the text as the button's description either way.
 */
export const InfoTip = ({ label, children }: InfoTipProps) => {
  const tipId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // A tap keeps it open on touch screens, where there's no hover.
  const [isPinned, setIsPinned] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isOpen = !isDismissed && (isHovered || isFocused || isPinned);
  const tipRef = useRef<HTMLSpanElement>(null);
  // Opens to the right of the button, or to its left when that would run past the window edge.
  const [opensLeft, setOpensLeft] = useState(false);

  useLayoutEffect(() => {
    if (!isOpen || !tipRef.current) return;
    const button = tipRef.current.parentElement!.getBoundingClientRect();
    const tipWidth = tipRef.current.offsetWidth;
    setOpensLeft(button.left + tipWidth > window.innerWidth - EDGE_GAP_PX);
  }, [isOpen]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setIsDismissed(true);
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => {
        setIsHovered(true);
        setIsDismissed(false);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={tipId}
        aria-expanded={isOpen}
        onClick={() => {
          setIsPinned((pinned) => !pinned);
          setIsDismissed(false);
        }}
        onFocus={() => {
          setIsFocused(true);
          setIsDismissed(false);
        }}
        onBlur={() => {
          setIsFocused(false);
          setIsPinned(false);
        }}
        onKeyDown={onKeyDown}
        className="inline-flex size-4 items-center justify-center rounded-full border border-line text-[10px] font-semibold leading-none text-ink-3 hover:border-ink-3 hover:text-ink"
      >
        ?
      </button>
      <span
        ref={tipRef}
        role="tooltip"
        id={tipId}
        className={`absolute ${opensLeft ? 'right-0' : 'left-0'} top-full z-20 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface-1 p-3 text-xs font-normal leading-relaxed text-ink-2 shadow-lg ${isOpen ? '' : 'hidden'}`}
      >
        {children}
      </span>
    </span>
  );
};
