import { COMMANDS, run } from '../core/commands';
import { complete } from '../core/complete';
import { History } from '../core/history';
import type { Effect, Line, Segment } from '../core/output';

export interface TerminalOptions {
  /** Opens a URL; injected so tests never touch window.open. */
  readonly open?: (href: string) => void;
  readonly now?: () => Date;
  /** Milliseconds per typed character in typeAndRun; 0 types instantly. */
  readonly typingDelay?: number;
  /** Fixes the line width instead of measuring it (tests have no layout). */
  readonly columns?: number;
}

export const PROMPT = 'guest@arslan:~$';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function query<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
  const el = root.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Terminal markup is missing ${selector}`);
  return el;
}

/** Connects the terminal markup in index.html to the command engine. */
export class Terminal {
  readonly history = new History();
  readonly #log: HTMLElement;
  readonly #form: HTMLFormElement;
  readonly #input: HTMLInputElement;
  readonly #ghost: HTMLElement;
  readonly #screen: HTMLElement;
  readonly #open: (href: string) => void;
  readonly #now: () => Date;
  readonly #typingDelay: number;
  readonly #columns: number | undefined;
  #busy = false;
  #skipTyping = false;

  constructor(root: ParentNode, options: TerminalOptions = {}) {
    this.#log = query(root, '[data-log]', HTMLElement);
    this.#form = query(root, '[data-form]', HTMLFormElement);
    this.#input = query(root, '[data-input]', HTMLInputElement);
    this.#ghost = query(root, '[data-ghost]', HTMLElement);
    this.#screen = query(root, '[data-screen]', HTMLElement);
    this.#open = options.open ?? ((href) => window.open(href, '_blank', 'noopener'));
    this.#now = options.now ?? (() => new Date());
    this.#typingDelay = options.typingDelay ?? 0;
    this.#columns = options.columns;

    this.#form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit(this.#input.value);
    });
    this.#input.addEventListener('keydown', (event) => {
      this.#onKey(event);
    });
    this.#input.addEventListener('input', () => {
      this.#updateGhost();
    });
    root.addEventListener('click', (event) => {
      this.#onClick(event);
    });
  }

  /** Prints the command next to a prompt, runs it and shows the result. */
  submit(value: string): void {
    this.#echo(value);
    const result = run(value, {
      history: this.history.entries,
      now: this.#now(),
      columns: this.columns,
    });
    this.history.push(value);
    if (result.effect) this.#apply(result.effect);
    this.print(result.lines);
    this.#setInput('');
  }

  /** Types a command into the prompt character by character, then runs it. */
  async typeAndRun(command: string): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    try {
      if (this.#typingDelay > 0) {
        for (let i = 1; i <= command.length && !this.#skipTyping; i++) {
          this.#setInput(command.slice(0, i));
          await sleep(this.#typingDelay);
        }
      }
      this.submit(command);
    } finally {
      this.#busy = false;
      this.#skipTyping = false;
    }
  }

  print(lines: readonly Line[]): void {
    const fragment = document.createDocumentFragment();
    for (const l of lines) fragment.append(this.#renderLine(l));
    this.#log.append(fragment);
    this.#scrollToEnd();
  }

  /** Characters per line at the current size; the font is monospaced, so 1ch is one column. */
  get columns(): number {
    if (this.#columns) return this.#columns;
    const ch = Number.parseFloat(getComputedStyle(this.#log).fontSize) * 0.6;
    const width = this.#log.clientWidth;
    return ch > 0 && width > 0 ? Math.floor(width / ch) : 80;
  }

  focus(): void {
    this.#input.focus({ preventScroll: true });
  }

  #echo(value: string): void {
    const row = document.createElement('div');
    row.className = 'line echo';
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = PROMPT;
    row.append(prompt, ` ${value}`);
    this.#log.append(row);
  }

  #renderLine(l: Line): HTMLElement {
    const row = document.createElement('div');
    row.className = 'line';
    if (l.length === 0) row.classList.add('blank');
    for (const s of l) row.append(this.#renderSegment(s));
    return row;
  }

  #renderSegment(s: Segment): Node {
    let el: HTMLElement;
    if (s.href) {
      const a = document.createElement('a');
      a.href = s.href;
      if (!s.href.startsWith('mailto:')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      el = a;
    } else if (s.command) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.command = s.command;
      el = button;
    } else if (s.tone) {
      el = document.createElement('span');
    } else {
      return document.createTextNode(s.text);
    }
    if (s.tone) el.classList.add(`tone-${s.tone}`);
    el.textContent = s.text;
    return el;
  }

  #apply(effect: Effect): void {
    switch (effect.kind) {
      case 'clear':
        this.#log.replaceChildren();
        break;
      case 'open':
        this.#open(effect.href);
        break;
    }
  }

  #onKey(event: KeyboardEvent): void {
    // A key press while a command is being typed out finishes it at once.
    if (this.#busy) {
      this.#skipTyping = true;
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.#complete();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.#setInput(this.history.previous(this.#input.value));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.#setInput(this.history.next());
    } else if (event.key === 'ArrowRight' && this.#ghost.textContent && this.#atEnd()) {
      event.preventDefault();
      this.#setInput(this.#input.value + this.#ghost.textContent);
    } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      this.#log.replaceChildren();
    } else if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      if (window.getSelection()?.toString()) return;
      event.preventDefault();
      this.#echo(`${this.#input.value}^C`);
      this.#setInput('');
    }
  }

  #complete(): void {
    const { value, options } = complete(this.#input.value, COMMANDS);
    if (options.length > 1 && value === this.#input.value) {
      this.#echo(value);
      this.print([options.map((o) => ({ text: `${o}   `, tone: 'accent' as const }))]);
    }
    this.#setInput(value);
  }

  #onClick(event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>('[data-command]');
    if (button?.dataset.command) {
      void this.typeAndRun(button.dataset.command);
      this.focus();
      return;
    }
    // Clicking empty screen space focuses the prompt, but never steals a text selection.
    if (
      target &&
      this.#screen.contains(target) &&
      !target.closest('a') &&
      !window.getSelection()?.toString()
    ) {
      this.focus();
    }
  }

  #setInput(value: string): void {
    this.#input.value = value;
    this.#input.setSelectionRange(value.length, value.length);
    this.#updateGhost();
  }

  #atEnd(): boolean {
    return this.#input.selectionStart === this.#input.value.length;
  }

  /** Shows the rest of the only possible completion in grey after the cursor. */
  #updateGhost(): void {
    const value = this.#input.value;
    const { value: completed, options } = value.trim()
      ? complete(value, COMMANDS)
      : { value, options: [] };
    const rest =
      options.length === 1 && completed.startsWith(value)
        ? completed.slice(value.length).trimEnd()
        : '';
    this.#ghost.textContent = rest;
    this.#ghost.style.setProperty('--offset', `${value.length}ch`);
  }

  #scrollToEnd(): void {
    this.#screen.scrollTop = this.#screen.scrollHeight;
  }
}
