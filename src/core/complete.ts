export interface Completable {
  readonly name: string;
  readonly hidden?: boolean;
  readonly completions?: readonly string[];
}

export interface Completion {
  /** The new input line (unchanged when nothing matches). */
  readonly value: string;
  /** Every match, so the terminal can list them when there is more than one. */
  readonly options: readonly string[];
}

/** The longest prefix shared by all the words. */
export function commonPrefix(words: readonly string[]): string {
  const [first = '', ...rest] = words;
  let end = first.length;
  for (const w of rest) {
    let i = 0;
    while (i < end && i < w.length && w[i] === first[i]) i++;
    end = i;
  }
  return first.slice(0, end);
}

/**
 * Tab completion: the first word completes to a command name, the second to one of that
 * command's arguments. A single match is completed with a trailing space; several matches extend
 * the input to their common prefix and are returned so the terminal can show them.
 */
export function complete(input: string, commands: readonly Completable[]): Completion {
  const lead = /^\s*/u.exec(input)?.[0] ?? '';
  const body = input.slice(lead.length);
  const space = body.indexOf(' ');

  let before: string;
  let word: string;
  let pool: readonly string[];
  if (space === -1) {
    before = lead;
    word = body;
    pool = commands.filter((c) => !c.hidden).map((c) => c.name);
  } else {
    const name = body.slice(0, space).toLowerCase();
    const rest = body.slice(space + 1);
    if (rest.includes(' ')) return { value: input, options: [] };
    before = `${lead}${body.slice(0, space + 1)}`;
    word = rest;
    pool = commands.find((c) => c.name === name)?.completions ?? [];
  }

  const options = pool.filter((p) => p.startsWith(word.toLowerCase())).sort();
  if (options.length === 0) return { value: input, options };
  if (options.length === 1) return { value: `${before}${options[0] ?? ''} `, options };
  const prefix = commonPrefix(options);
  return { value: `${before}${prefix.length > word.length ? prefix : word}`, options };
}
