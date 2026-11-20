import { useEffect, useRef, useState } from 'react';
import { INFINITE_SCROLL_MARGIN } from '../constants';

type InfiniteScrollOptions = {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
};

/**
 * Calls `onLoadMore` when the returned sentinel element nears the viewport. The observer is
 * recreated after each load, and a new observer reports at once, so a page too short to fill the
 * screen keeps loading until it does.
 */
export const useInfiniteScroll = ({ hasMore, isLoading, onLoadMore }: InfiniteScrollOptions) => {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  // Kept in a ref so a new callback each render doesn't recreate the observer.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const canLoad = sentinel && hasMore && !isLoading;
    if (!canLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isNearViewport = entries.some((entry) => entry.isIntersecting);
        if (isNearViewport) onLoadMoreRef.current();
      },
      { rootMargin: INFINITE_SCROLL_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasMore, isLoading]);

  return setSentinel;
};
