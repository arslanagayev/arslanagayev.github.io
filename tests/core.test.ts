import { describe, expect, it } from 'vitest';
import { commonPrefix, complete } from '../src/core/complete';
import { History } from '../src/core/history';
import { parse, tokenize } from '../src/core/parse';
import { distance, suggest } from '../src/core/suggest';

describe('tokenize', () => {
  it('splits on any whitespace and drops empty words', () => {
    expect(tokenize('  open   vyra\tnow ')).toEqual(['open', 'vyra', 'now']);
  });

  it('keeps quoted spaces inside one word', () => {
    expect(tokenize(`echo "hello world" 'and you'`)).toEqual(['echo', 'hello world', 'and you']);
  });

  it('keeps an empty quoted word and runs an unclosed quote to the end', () => {
    expect(tokenize('echo "" "open end')).toEqual(['echo', '', 'open end']);
  });
});

describe('parse', () => {
  it('lower-cases the command name but not the arguments', () => {
    expect(parse('PROJECT Vyra')).toEqual({ name: 'project', args: ['Vyra'] });
  });

  it('returns an empty name for a blank line', () => {
    expect(parse('   ')).toEqual({ name: '', args: [] });
  });
});

describe('suggest', () => {
  it('counts a swapped pair of letters as one edit', () => {
    expect(distance('hlep', 'help')).toBe(1);
    expect(distance('abc', 'abc')).toBe(0);
    expect(distance('', 'abc')).toBe(3);
  });

  it('finds the closest command within the allowed distance', () => {
    const names = ['help', 'about', 'projects', 'project', 'contact'];
    expect(suggest('hlep', names)).toBe('help');
    expect(suggest('projct', names)).toBe('project');
    expect(suggest('CONTCT', names)).toBe('contact');
  });

  it('gives up when nothing is close', () => {
    expect(suggest('xyz', ['help', 'about'])).toBeUndefined();
    expect(suggest('ab', ['about'])).toBeUndefined();
  });
});

describe('complete', () => {
  const commands = [
    { name: 'project', completions: ['vyra', 'nebula', 'nemo'] },
    { name: 'projects' },
    { name: 'help' },
    { name: 'sudo', hidden: true },
  ];

  it('finds the longest shared prefix', () => {
    expect(commonPrefix(['nebula', 'nemo'])).toBe('ne');
    expect(commonPrefix([])).toBe('');
  });

  it('completes a unique command name with a trailing space', () => {
    expect(complete('he', commands)).toEqual({ value: 'help ', options: ['help'] });
  });

  it('extends to the shared prefix and lists every match', () => {
    expect(complete('pro', commands)).toEqual({
      value: 'project',
      options: ['project', 'projects'],
    });
  });

  it('completes arguments of the command already typed', () => {
    expect(complete('project vy', commands).value).toBe('project vyra ');
    expect(complete('  project n', commands)).toEqual({
      value: '  project ne',
      options: ['nebula', 'nemo'],
    });
  });

  it('never offers hidden commands and leaves unknown input alone', () => {
    expect(complete('su', commands)).toEqual({ value: 'su', options: [] });
    expect(complete('help me now', commands)).toEqual({ value: 'help me now', options: [] });
    expect(complete('unknown x', commands)).toEqual({ value: 'unknown x', options: [] });
  });
});

describe('History', () => {
  it('walks back and forward, then restores the draft', () => {
    const h = new History();
    h.push('help');
    h.push('about');
    expect(h.previous('draft')).toBe('about');
    expect(h.previous('ignored')).toBe('help');
    expect(h.previous('ignored')).toBe('help');
    expect(h.next()).toBe('about');
    expect(h.next()).toBe('draft');
    expect(h.next()).toBe('draft');
  });

  it('skips blanks and repeats, and keeps only the newest entries', () => {
    const h = new History(2);
    for (const c of ['a', 'a', ' ', 'b', 'c']) h.push(c);
    expect(h.entries).toEqual(['b', 'c']);
  });

  it('returns the current text when there is no history', () => {
    expect(new History().previous('typing')).toBe('typing');
  });
});
