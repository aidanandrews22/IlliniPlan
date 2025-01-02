import { useEffect, useCallback, RefObject } from 'react';

interface UseContainerInfiniteScrollProps {
  containerRef: RefObject<HTMLElement>;
  onLoadMore: () => void;
  hasMore: boolean;
  threshold?: number;
}

export const useContainerInfiniteScroll = ({ 
  containerRef,
  onLoadMore,
  hasMore,
  threshold = 200
}: UseContainerInfiniteScrollProps) => {
  const handleScroll = useCallback(() => {
    if (!hasMore || !containerRef.current) return;

    const { scrollHeight, scrollTop, clientHeight } = containerRef.current;

    // Load more when user scrolls to bottom (with threshold)
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, containerRef, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, handleScroll]);
}; 