import { useState, useEffect, useCallback, RefObject } from "react";

interface UseKeyboardNavigationOptions<T> {
  /** List of items to navigate through */
  items: T[];
  /** Whether the navigation is active (e.g., dropdown is open) */
  isActive: boolean;
  /** Callback when an item is selected via Enter key */
  onSelect?: (item: T, index: number) => void;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Number of items to jump when using PageUp/PageDown */
  pageSize?: number;
  /** Ref to the scrollable container for auto-scrolling */
  listRef?: RefObject<HTMLElement>;
  /** Data attribute name used on list items for scrolling */
  itemDataAttribute?: string;
  /** Dependencies that should reset the highlighted index */
  resetDependencies?: unknown[];
}

interface UseKeyboardNavigationReturn {
  /** Currently highlighted index (-1 means no highlight) */
  highlightedIndex: number;
  /** Set the highlighted index manually (e.g., on mouse hover) */
  setHighlightedIndex: (index: number | ((prev: number) => number)) => void;
  /** Keyboard event handler to attach to the input/container */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Check if an item at a given index is highlighted */
  isHighlighted: (index: number) => boolean;
  /** Reset highlighted index to -1 */
  resetHighlight: () => void;
}

/**
 * A reusable hook for keyboard navigation in dropdowns, lists, and menus.
 * 
 * Supports:
 * - Arrow Up/Down: Navigate one item at a time (with wrap-around)
 * - PageUp/PageDown: Jump multiple items at once
 * - Home/End: Jump to first/last item
 * - Enter: Select the highlighted item
 * - Escape: Close/cancel the navigation
 * 
 * @example
 * ```tsx
 * const { highlightedIndex, handleKeyDown, setHighlightedIndex } = useKeyboardNavigation({
 *   items: countries,
 *   isActive: isDropdownOpen,
 *   onSelect: (country) => selectCountry(country),
 *   onEscape: () => setIsDropdownOpen(false),
 *   listRef: dropdownListRef,
 * });
 * 
 * // In JSX:
 * <input onKeyDown={handleKeyDown} />
 * {items.map((item, index) => (
 *   <button
 *     data-index={index}
 *     onMouseEnter={() => setHighlightedIndex(index)}
 *     className={highlightedIndex === index ? 'bg-accent' : ''}
 *   >
 *     {item.name}
 *   </button>
 * ))}
 * ```
 */
export function useKeyboardNavigation<T>({
  items,
  isActive,
  onSelect,
  onEscape,
  pageSize = 10,
  listRef,
  itemDataAttribute = "data-index",
  resetDependencies = [],
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationReturn {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Reset highlighted index when dependencies change
  useEffect(() => {
    setHighlightedIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ...resetDependencies]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef?.current) {
      const highlightedElement = listRef.current.querySelector(
        `[${itemDataAttribute}="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, listRef, itemDataAttribute]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive || items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : 0
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : items.length - 1
          );
          break;

        case "PageDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + pageSize, items.length - 1)
          );
          break;

        case "PageUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - pageSize, 0));
          break;

        case "Home":
          e.preventDefault();
          setHighlightedIndex(0);
          break;

        case "End":
          e.preventDefault();
          setHighlightedIndex(items.length - 1);
          break;

        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect?.(items[highlightedIndex], highlightedIndex);
          }
          break;

        case "Escape":
          e.preventDefault();
          onEscape?.();
          break;
      }
    },
    [isActive, items, highlightedIndex, pageSize, onSelect, onEscape]
  );

  const isHighlighted = useCallback(
    (index: number) => index === highlightedIndex,
    [highlightedIndex]
  );

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
  }, []);

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    isHighlighted,
    resetHighlight,
  };
}
