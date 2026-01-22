import { useState, useEffect, useCallback, useRef, RefObject } from "react";

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
  /** 
   * Function to get a searchable label from an item for type-ahead.
   * If not provided, type-ahead is disabled.
   */
  getSearchLabel?: (item: T) => string;
  /** Debounce time in ms for type-ahead search reset (default: 500ms) */
  typeAheadDebounce?: number;
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
  /** Current type-ahead search query (for debugging/display) */
  typeAheadQuery: string;
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
 * - Type-ahead: Type letters quickly to jump to matching items
 * 
 * @example
 * ```tsx
 * const { highlightedIndex, handleKeyDown, setHighlightedIndex } = useKeyboardNavigation({
 *   items: countries,
 *   isActive: isDropdownOpen,
 *   onSelect: (country) => selectCountry(country),
 *   onEscape: () => setIsDropdownOpen(false),
 *   listRef: dropdownListRef,
 *   getSearchLabel: (country) => country.name, // Enable type-ahead
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
  getSearchLabel,
  typeAheadDebounce = 500,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationReturn {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [typeAheadQuery, setTypeAheadQuery] = useState("");
  const typeAheadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset highlighted index when dependencies change
  useEffect(() => {
    setHighlightedIndex(-1);
    setTypeAheadQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ...resetDependencies]);

  // Clear type-ahead timeout on unmount
  useEffect(() => {
    return () => {
      if (typeAheadTimeoutRef.current) {
        clearTimeout(typeAheadTimeoutRef.current);
      }
    };
  }, []);

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
          setTypeAheadQuery("");
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : 0
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setTypeAheadQuery("");
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : items.length - 1
          );
          break;

        case "PageDown":
          e.preventDefault();
          setTypeAheadQuery("");
          setHighlightedIndex((prev) =>
            Math.min(prev + pageSize, items.length - 1)
          );
          break;

        case "PageUp":
          e.preventDefault();
          setTypeAheadQuery("");
          setHighlightedIndex((prev) => Math.max(prev - pageSize, 0));
          break;

        case "Home":
          e.preventDefault();
          setTypeAheadQuery("");
          setHighlightedIndex(0);
          break;

        case "End":
          e.preventDefault();
          setTypeAheadQuery("");
          setHighlightedIndex(items.length - 1);
          break;

        case "Enter":
          e.preventDefault();
          setTypeAheadQuery("");
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect?.(items[highlightedIndex], highlightedIndex);
          }
          break;

        case "Escape":
          e.preventDefault();
          setTypeAheadQuery("");
          onEscape?.();
          break;

        default:
          // Type-ahead: single printable character (letter or digit)
          if (getSearchLabel && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const char = e.key.toLowerCase();
            
            // Clear previous timeout
            if (typeAheadTimeoutRef.current) {
              clearTimeout(typeAheadTimeoutRef.current);
            }

            // Build new search query
            const newQuery = typeAheadQuery + char;
            setTypeAheadQuery(newQuery);

            // Find matching item
            const matchIndex = items.findIndex((item) =>
              getSearchLabel(item).toLowerCase().startsWith(newQuery)
            );

            if (matchIndex !== -1) {
              setHighlightedIndex(matchIndex);
            } else if (newQuery.length === 1) {
              // If no match with single char, try to find next item starting with this letter
              // starting from current position (for cycling through same-letter items)
              const startIndex = highlightedIndex >= 0 ? highlightedIndex + 1 : 0;
              
              // Search from current position to end
              let foundIndex = items.findIndex((item, idx) =>
                idx >= startIndex && getSearchLabel(item).toLowerCase().startsWith(char)
              );
              
              // If not found, wrap around and search from beginning
              if (foundIndex === -1) {
                foundIndex = items.findIndex((item) =>
                  getSearchLabel(item).toLowerCase().startsWith(char)
                );
              }
              
              if (foundIndex !== -1) {
                setHighlightedIndex(foundIndex);
              }
            }

            // Reset query after debounce time
            typeAheadTimeoutRef.current = setTimeout(() => {
              setTypeAheadQuery("");
            }, typeAheadDebounce);
          }
          break;
      }
    },
    [isActive, items, highlightedIndex, pageSize, onSelect, onEscape, getSearchLabel, typeAheadQuery, typeAheadDebounce]
  );

  const isHighlighted = useCallback(
    (index: number) => index === highlightedIndex,
    [highlightedIndex]
  );

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
    setTypeAheadQuery("");
  }, []);

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    isHighlighted,
    resetHighlight,
    typeAheadQuery,
  };
}
