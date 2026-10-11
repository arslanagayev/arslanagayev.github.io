/**
 * Shell-style command history: ↑ walks back through earlier commands, ↓ walks forward and finally
 * returns to whatever was being typed before browsing started.
 */
export class History {
  readonly #entries: string[] = [];
  #cursor = 0;
  #draft = '';
  readonly #limit: number;

  constructor(limit = 100) {
    this.#limit = limit;
  }

  get entries(): readonly string[] {
    return this.#entries;
  }

  /** Records a submitted command (blank lines and repeats of the last one are skipped). */
  push(command: string): void {
    const value = command.trim();
    if (value && this.#entries.at(-1) !== value) {
      this.#entries.push(value);
      if (this.#entries.length > this.#limit) this.#entries.shift();
    }
    this.#cursor = this.#entries.length;
    this.#draft = '';
  }

  /** The previous command, keeping `current` as the draft when browsing starts. */
  previous(current: string): string {
    if (this.#cursor === this.#entries.length) this.#draft = current;
    if (this.#cursor > 0) this.#cursor--;
    return this.#entries[this.#cursor] ?? current;
  }

  /** The next command, or the saved draft once past the newest entry. */
  next(): string {
    if (this.#cursor < this.#entries.length) this.#cursor++;
    return this.#cursor === this.#entries.length
      ? this.#draft
      : (this.#entries[this.#cursor] ?? '');
  }
}
