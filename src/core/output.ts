/** The terminal prints lines made of styled segments, so commands never build HTML themselves. */

export type Tone = 'accent' | 'muted' | 'error' | 'strong';

export interface Segment {
  readonly text: string;
  readonly tone?: Tone;
  /** Renders the segment as a link. */
  readonly href?: string;
  /** Renders the segment as a button that runs this command. */
  readonly command?: string;
}

export type Line = readonly Segment[];

export type Effect = { readonly kind: 'clear' } | { readonly kind: 'open'; readonly href: string };

export interface Result {
  readonly lines: readonly Line[];
  readonly effect?: Effect;
}

export const seg = (text: string, tone?: Tone): Segment => (tone ? { text, tone } : { text });
export const link = (text: string, href: string): Segment => ({ text, href, tone: 'accent' });
export const cmd = (command: string, text = command): Segment => ({
  text,
  command,
  tone: 'accent',
});
export const line = (...segments: Segment[]): Line => segments;
export const text = (value: string, tone?: Tone): Line => [seg(value, tone)];
export const blank: Line = [];

/** Pads a label so the values after it line up in a column. */
export const pad = (label: string, width: number): string => label.padEnd(width, ' ');

/** The plain text of a line, as a screen reader or a test would read it. */
export const plain = (l: Line): string => l.map((s) => s.text).join('');
