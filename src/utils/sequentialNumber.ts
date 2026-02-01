/**
 * Get the next sequential number based on existing numbers
 * @param existingNumbers - Array of existing number strings
 * @param padLength - Length to pad the number (default: 4)
 * @returns The next sequential number as a padded string
 */
export function getNextSequentialNumber(existingNumbers: string[], padLength: number = 4): string {
  if (existingNumbers.length === 0) {
    return '1'.padStart(padLength, '0');
  }

  // Parse all numbers and find the maximum
  const maxNumber = existingNumbers.reduce((max, numStr) => {
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  return String(maxNumber + 1).padStart(padLength, '0');
}
