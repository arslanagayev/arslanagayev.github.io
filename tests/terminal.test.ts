// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../index.html?raw';
import { Terminal } from '../src/ui/terminal';

const body = /<body>([\s\S]*)<\/body>/u.exec(html)?.[1] ?? '';

const $ = <T extends Element>(selector: string): T => document.querySelector<T>(selector)!;
const input = (): HTMLInputElement => $('[data-input]');
const log = (): string => $<HTMLElement>('[data-log]').textContent;
const key = (k: string, init: KeyboardEventInit = {}): void => {
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
  );
};
const type = (value: string): void => {
  input().value = value;
  input().dispatchEvent(new Event('input', { bubbles: true }));
};
const enter = (): void => {
  $<HTMLFormElement>('[data-form]').requestSubmit();
};

let open: ReturnType<typeof vi.fn<(href: string) => void>>;
let terminal: Terminal;

beforeEach(() => {
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/u, '');
  open = vi.fn<(href: string) => void>();
  terminal = new Terminal(document, { open, columns: 100, now: () => new Date(0) });
});

describe('Terminal', () => {
  it('fails loudly when the markup is missing', () => {
    document.body.innerHTML = '';
    expect(() => new Terminal(document)).toThrow(/data-log/u);
  });

  it('echoes the command after the prompt and prints the result', () => {
    type('whoami');
    enter();
    expect(log()).toContain('guest@arslan:~$ whoami');
    expect(log()).toContain('Welcome!');
    expect(input().value).toBe('');
  });

  it('renders links and clickable commands', () => {
    terminal.submit('contact');
    const mail = $<HTMLAnchorElement>('[data-log] a[href^="mailto:"]');
    const github = $<HTMLAnchorElement>('[data-log] a[href="https://github.com/arslanagayev"]');
    expect(mail.target).toBe('');
    expect(github.target).toBe('_blank');
    expect(github.rel).toBe('noopener noreferrer');

    terminal.submit('help');
    expect(document.querySelectorAll('[data-log] button[data-command]').length).toBeGreaterThan(10);
  });

  it('runs a command when its button is clicked', async () => {
    $<HTMLButtonElement>('.chips [data-command="skills"]').click();
    await vi.waitFor(() => {
      expect(log()).toContain('Languages');
    });
  });

  it('types a command out before running it', async () => {
    vi.useFakeTimers();
    const slow = new Terminal(document, { typingDelay: 10, columns: 100 });
    const done = slow.typeAndRun('about');
    await vi.advanceTimersByTimeAsync(15);
    expect(input().value).toBe('ab');
    void slow.typeAndRun('help');
    await vi.advanceTimersByTimeAsync(100);
    await done;
    expect(log()).toContain('Arslan Agayev');
    expect(log()).not.toContain('Commands (click one');
    vi.useRealTimers();
  });

  it('finishes the typing at once when a key is pressed', async () => {
    vi.useFakeTimers();
    const slow = new Terminal(document, { typingDelay: 10, columns: 100 });
    const done = slow.typeAndRun('skills');
    await vi.advanceTimersByTimeAsync(5);
    key('x');
    await vi.advanceTimersByTimeAsync(10);
    await done;
    expect(log()).toContain('guest@arslan:~$ skills');
    expect(input().value).toBe('');
    vi.useRealTimers();
  });

  it('opens links through the injected opener', () => {
    terminal.submit('open github');
    expect(open).toHaveBeenCalledWith('https://github.com/arslanagayev');
  });

  it('clears the screen with the command and with Ctrl+L', () => {
    terminal.submit('about');
    terminal.submit('clear');
    expect(log()).toBe('');
    terminal.submit('about');
    key('l', { ctrlKey: true });
    expect(log()).toBe('');
  });

  it('Ctrl+C abandons the current line', () => {
    type('half typed');
    key('c', { ctrlKey: true });
    expect(log()).toContain('half typed^C');
    expect(input().value).toBe('');
  });

  it('completes with Tab and lists several matches', () => {
    type('sk');
    key('Tab');
    expect(input().value).toBe('skills ');

    type('pro');
    key('Tab');
    expect(input().value).toBe('project');
    key('Tab');
    expect(log()).toContain('project   projects');
  });

  it('shows the rest of a unique completion and accepts it with →', () => {
    type('cont');
    expect($('[data-ghost]').textContent).toBe('act');
    key('ArrowRight');
    expect(input().value).toBe('contact');
    type('');
    expect($('[data-ghost]').textContent).toBe('');
  });

  it('walks through history with the arrow keys', () => {
    terminal.submit('help');
    terminal.submit('about');
    type('draft');
    key('ArrowUp');
    expect(input().value).toBe('about');
    key('ArrowUp');
    expect(input().value).toBe('help');
    key('ArrowDown');
    key('ArrowDown');
    expect(input().value).toBe('draft');
  });

  it('focuses the prompt when the screen is clicked', () => {
    input().blur();
    $<HTMLElement>('[data-log]').click();
    expect(document.activeElement).toBe(input());
  });

  it('measures the width when no column count is given', () => {
    const measured = new Terminal(document);
    expect(measured.columns).toBeGreaterThan(0);
  });
});
