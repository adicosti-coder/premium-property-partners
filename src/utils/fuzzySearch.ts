/**
 * Fuzzy search utility for matching strings with typos and partial matches.
 */

export interface FuzzyMatch {
  item: string;
  score: number;
  matches: number[]; // Indices of matching characters
}

/**
 * Calculate the Levenshtein distance between two strings.
 * Lower distance = more similar strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Get indices of matching characters in target string.
 */
export function getMatchIndices(query: string, target: string): number[] {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];

  // Check for substring match first (exact or contains)
  const substringIndex = t.indexOf(q);
  if (substringIndex !== -1) {
    for (let i = substringIndex; i < substringIndex + q.length; i++) {
      indices.push(i);
    }
    return indices;
  }

  // Check for characters appearing in order
  let queryIndex = 0;
  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      indices.push(i);
      queryIndex++;
    }
  }

  return indices;
}

/**
 * Calculate a fuzzy match score between a query and a target string.
 * Returns a score from 0 (no match) to 1 (perfect match).
 * 
 * Scoring criteria:
 * - Exact match: 1.0
 * - Starts with query: 0.9
 * - Contains query as substring: 0.7
 * - Fuzzy match with low distance: 0.3-0.6
 * - No reasonable match: 0
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (!q || !t) return 0;

  // Exact match
  if (t === q) return 1.0;

  // Starts with query
  if (t.startsWith(q)) return 0.9;

  // Contains query as substring
  if (t.includes(q)) return 0.7;

  // Check if all characters of query appear in order in target
  let queryIndex = 0;
  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      queryIndex++;
    }
  }
  
  if (queryIndex === q.length) {
    // All characters found in order
    return 0.5 + (0.2 * (q.length / t.length));
  }

  // Check for word boundary matches (e.g., "uk" matches "United Kingdom")
  const words = t.split(/\s+/);
  const initials = words.map(w => w[0]).join('').toLowerCase();
  if (initials.startsWith(q)) {
    return 0.6;
  }

  // Levenshtein distance for typo tolerance
  const distance = levenshteinDistance(q, t.slice(0, q.length + 2));
  const maxDistance = Math.max(q.length, 3); // Allow more tolerance for longer queries
  
  if (distance <= maxDistance) {
    return 0.3 * (1 - distance / maxDistance);
  }

  return 0;
}

/**
 * Filter and sort items by fuzzy match score.
 * Returns items with score > minScore, sorted by score descending.
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchableStrings: (item: T) => string[],
  minScore: number = 0.2
): Array<{ item: T; score: number; matchIndices: Map<string, number[]> }> {
  if (!query.trim()) {
    return items.map(item => ({ item, score: 1, matchIndices: new Map() }));
  }

  const results: Array<{ item: T; score: number; matchIndices: Map<string, number[]> }> = [];

  for (const item of items) {
    const searchableStrings = getSearchableStrings(item);
    let maxScore = 0;
    const matchIndices = new Map<string, number[]>();

    for (const str of searchableStrings) {
      const score = fuzzyScore(query, str);
      if (score > 0) {
        matchIndices.set(str, getMatchIndices(query, str));
      }
      maxScore = Math.max(maxScore, score);
    }

    if (maxScore >= minScore) {
      results.push({ item, score: maxScore, matchIndices });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Simple fuzzy search that returns boolean match result.
 * Useful for quick filtering.
 */
export function fuzzyMatch(query: string, target: string, threshold: number = 0.2): boolean {
  return fuzzyScore(query, target) >= threshold;
}
