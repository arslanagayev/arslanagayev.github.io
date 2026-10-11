export interface Parsed {
  /** The command name, lower-cased; empty for a blank line. */
  readonly name: string;
  readonly args: readonly string[];
}

/**
 * Splits a command line into words like a shell does: whitespace separates words, and single or
 * double quotes keep spaces inside one word. An unclosed quote runs to the end of the line.
 */
export function tokenize(input: string): string[] {
  const words: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let inWord = false;

  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
    } else if (/\s/u.test(ch)) {
      if (inWord) words.push(current);
      current = '';
      inWord = false;
    } else {
      current += ch;
      inWord = true;
    }
  }
  if (inWord) words.push(current);
  return words;
}

export function parse(input: string): Parsed {
  const [first = '', ...args] = tokenize(input);
  return { name: first.toLowerCase(), args };
}
