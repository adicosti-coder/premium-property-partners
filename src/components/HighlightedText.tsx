import { memo } from "react";

interface HighlightedTextProps {
  text: string;
  highlightIndices: number[];
  highlightClassName?: string;
}

/**
 * Renders text with specific character indices highlighted.
 * Uses memo for performance optimization in long lists.
 */
const HighlightedText = memo(function HighlightedText({
  text,
  highlightIndices,
  highlightClassName = "bg-primary/30 text-primary font-semibold rounded-sm",
}: HighlightedTextProps) {
  if (!highlightIndices.length) {
    return <>{text}</>;
  }

  const indexSet = new Set(highlightIndices);
  const result: React.ReactNode[] = [];
  let currentGroup: string[] = [];
  let isCurrentHighlighted = false;

  const flushGroup = (index: number) => {
    if (currentGroup.length > 0) {
      if (isCurrentHighlighted) {
        result.push(
          <mark key={index} className={highlightClassName}>
            {currentGroup.join("")}
          </mark>
        );
      } else {
        result.push(<span key={index}>{currentGroup.join("")}</span>);
      }
      currentGroup = [];
    }
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const shouldHighlight = indexSet.has(i);

    if (i === 0) {
      isCurrentHighlighted = shouldHighlight;
      currentGroup.push(char);
    } else if (shouldHighlight === isCurrentHighlighted) {
      currentGroup.push(char);
    } else {
      flushGroup(i);
      isCurrentHighlighted = shouldHighlight;
      currentGroup.push(char);
    }
  }

  flushGroup(text.length);

  return <>{result}</>;
});

export default HighlightedText;
