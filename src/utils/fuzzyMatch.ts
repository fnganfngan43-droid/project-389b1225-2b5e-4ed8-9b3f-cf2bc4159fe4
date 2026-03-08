/**
 * Find the closest matching account name from the chart of accounts.
 * Uses Levenshtein distance for fuzzy matching.
 */

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Find the best matching name from a list of known names.
 * Returns the original name if an exact match exists,
 * or the closest match if similarity is above threshold.
 * 
 * @param input - The input name (possibly with typos)
 * @param knownNames - List of valid names from the system
 * @param maxDistanceRatio - Maximum allowed distance as ratio of string length (default 0.3 = 30%)
 * @returns The corrected name, or the original if no good match found
 */
export function findClosestMatch(
  input: string,
  knownNames: string[],
  maxDistanceRatio: number = 0.3
): string {
  if (!input || knownNames.length === 0) return input;

  const trimmed = input.trim();
  
  // Exact match first
  const exact = knownNames.find(n => n === trimmed);
  if (exact) return exact;

  // Normalize and check again
  const normalized = trimmed.replace(/\s+/g, ' ');
  const exactNormalized = knownNames.find(n => n.replace(/\s+/g, ' ') === normalized);
  if (exactNormalized) return exactNormalized;

  // Fuzzy match
  let bestMatch = trimmed;
  let bestDistance = Infinity;

  for (const name of knownNames) {
    const dist = levenshteinDistance(normalized, name.replace(/\s+/g, ' '));
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = name;
    }
  }

  // Only accept if distance is within threshold
  const maxAllowed = Math.max(2, Math.floor(trimmed.length * maxDistanceRatio));
  if (bestDistance <= maxAllowed) {
    return bestMatch;
  }

  return trimmed;
}
