/** Edit distance with adjacent swaps counted as one edit, so "hlep" is one step from "help". */
export function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  const at = (i: number, j: number): number => d[i]?.[j] ?? 0;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1);
      }
      const row = d[i];
      if (row) row[j] = best;
    }
  }
  return at(a.length, b.length);
}

/**
 * The closest candidate to a mistyped word, or undefined when nothing is close enough.
 * Short words allow one mistake, longer ones two.
 */
export function suggest(word: string, candidates: readonly string[]): string | undefined {
  const input = word.toLowerCase();
  const limit = input.length <= 3 ? 1 : 2;
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const dist = distance(input, candidate);
    if (dist <= limit && dist < bestDistance) {
      best = candidate;
      bestDistance = dist;
    }
  }
  return best;
}
