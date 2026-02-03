import React, { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "../design-system/utils/cn";

interface VirtualizedArticleListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  isLoading?: boolean;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

function getItemHeight(
  itemHeight: number | ((index: number) => number),
  index: number,
): number {
  return typeof itemHeight === "function" ? itemHeight(index) : itemHeight;
}

function calculateRange(
  scrollTop: number,
  containerHeight: number,
  totalItems: number,
  itemHeight: number | ((index: number) => number),
  overscan: number,
): { startIndex: number; endIndex: number; items: VirtualItem[] } {
  const items: VirtualItem[] = [];
  let currentOffset = 0;
  let startIndex = 0;
  let endIndex = 0;
  let foundStart = false;

  for (let i = 0; i < totalItems; i++) {
    const height = getItemHeight(itemHeight, i);

    if (!foundStart && currentOffset + height >= scrollTop) {
      startIndex = Math.max(0, i - overscan);
      foundStart = true;
    }

    if (foundStart && currentOffset > scrollTop + containerHeight) {
      endIndex = Math.min(totalItems - 1, i + overscan);
      break;
    }

    currentOffset += height;
  }

  if (!foundStart) {
    startIndex = 0;
  }

  if (endIndex === 0) {
    endIndex = totalItems - 1;
  }

  // Calculate items with their positions
  let offset = 0;
  for (let i = 0; i < startIndex; i++) {
    offset += getItemHeight(itemHeight, i);
  }

  for (let i = startIndex; i <= endIndex; i++) {
    const size = getItemHeight(itemHeight, i);
    items.push({
      index: i,
      start: offset,
      size,
    });
    offset += size;
  }

  return { startIndex, endIndex, items };
}

function calculateTotalHeight(
  totalItems: number,
  itemHeight: number | ((index: number) => number),
): number {
  if (typeof itemHeight === "number") {
    return totalItems * itemHeight;
  }

  let total = 0;
  for (let i = 0; i < totalItems; i++) {
    total += itemHeight(i);
  }
  return total;
}

export default function VirtualizedArticleList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className,
  containerClassName,
  emptyState,
  loadingState,
  isLoading = false,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualizedArticleListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalHeight = calculateTotalHeight(items.length, itemHeight);

  const { items: virtualItems } = calculateRange(
    scrollTop,
    containerHeight,
    items.length,
    itemHeight,
    overscan,
  );

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      setScrollTop(target.scrollTop);

      // Check if near end
      if (onEndReached) {
        const distanceFromEnd =
          target.scrollHeight - target.scrollTop - target.clientHeight;
        if (distanceFromEnd < endReachedThreshold) {
          onEndReached();
        }
      }
    },
    [onEndReached, endReachedThreshold],
  );

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  if (isLoading && items.length === 0) {
    return loadingState || null;
  }

  if (items.length === 0) {
    return emptyState || null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto relative", containerClassName)}
      onScroll={handleScroll}
    >
      <div
        className={cn("relative", className)}
        style={{ height: `${totalHeight}px` }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.index}
            className="absolute left-0 right-0"
            style={{
              top: `${virtualItem.start}px`,
              height: `${virtualItem.size}px`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="sticky bottom-0 left-0 right-0 py-4 text-center bg-linear-to-t from-white dark:from-neutral-900 to-transparent">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-700">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Loading more...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for virtualization
export function useVirtualization<T>(
  items: T[],
  options: {
    containerRef: React.RefObject<HTMLDivElement>;
    itemHeight: number | ((index: number) => number);
    overscan?: number;
  },
) {
  const { containerRef, itemHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalHeight = calculateTotalHeight(items.length, itemHeight);

  const {
    startIndex,
    endIndex,
    items: virtualItems,
  } = calculateRange(
    scrollTop,
    containerHeight,
    items.length,
    itemHeight,
    overscan,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    container.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  const scrollToIndex = useCallback(
    (index: number, align: "start" | "center" | "end" = "start") => {
      const container = containerRef.current;
      if (!container || index < 0 || index >= items.length) return;

      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(itemHeight, i);
      }

      const itemSize = getItemHeight(itemHeight, index);

      let scrollTo = offset;
      if (align === "center") {
        scrollTo = offset - (container.clientHeight - itemSize) / 2;
      } else if (align === "end") {
        scrollTo = offset - container.clientHeight + itemSize;
      }

      container.scrollTo({ top: Math.max(0, scrollTo), behavior: "smooth" });
    },
    [containerRef, items.length, itemHeight],
  );

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollToIndex,
  };
}
