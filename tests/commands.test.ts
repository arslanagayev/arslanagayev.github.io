import { describe, expect, it } from 'vitest';
import { COMMANDS, run, type Context } from '../src/core/commands';
import { plain, type Result } from '../src/core/output';
import { CONTACT, PROJECTS } from '../src/data/profile';

const context: Context = { history: [], now: new Date('2026-10-11T12:00:00Z'), columns: 100 };
const exec = (input: string, ctx: Partial<Context> = {}): Result =>
  run(input, { ...context, ...ctx });
const textOf = (result: Result): string => result.lines.map(plain).join('\n');
const commandsIn = (result: Result): string[] =>
  result.lines.flatMap((l) => l.flatMap((s) => (s.command ? [s.command] : [])));
const errors = (result: Result): number =>
  result.lines.filter((l) => l.some((s) => s.tone === 'error')).length;

describe('every visible command', () => {
  const examples: Readonly<Record<string, string>> = {
    echo: 'echo hi',
    open: 'open github',
    cat: 'cat about.txt',
    project: 'project vyra',
  };
  for (const command of COMMANDS.filter((c) => !c.hidden && c.name !== 'clear')) {
    it(`"${command.name}" prints something without an error`, () => {
      const result = exec(examples[command.name] ?? command.name);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(errors(result)).toBe(0);
    });
  }

  it('every clickable command in the output is a real command', () => {
    const names = new Set(COMMANDS.map((c) => c.name));
    for (const c of COMMANDS) {
      for (const clicked of commandsIn(exec(c.name))) {
        expect(names.has(clicked.split(' ')[0]!)).toBe(true);
      }
    }
  });
});

describe('help', () => {
  it('lists every visible command and no hidden one', () => {
    const listed = commandsIn(exec('help'));
    expect(listed).toEqual(COMMANDS.filter((c) => !c.hidden).map((c) => c.name));
    expect(listed).not.toContain('sudo');
  });
});

describe('projects and project', () => {
  it('lists every project as a clickable detail command', () => {
    expect(commandsIn(exec('projects'))).toEqual(PROJECTS.map((p) => `project ${p.key}`));
  });

  it('shows details with the repo and the demo', () => {
    const result = exec('project vyra');
    const links = result.lines.flatMap((l) => l.flatMap((s) => (s.href ? [s.href] : [])));
    expect(textOf(result)).toContain('VYRA Energy');
    expect(links).toContain('https://github.com/arslanagayev/vyra-energy');
    expect(links).toContain('https://arslanagayev.github.io/vyra-energy/');
  });

  it('matches the full project name too, ignoring case', () => {
    expect(textOf(exec('project "Nebula Auth"'))).toContain('30,000-star');
  });

  it('lists the animation demos', () => {
    const links = exec('project animations').lines.flatMap((l) =>
      l.flatMap((s) => (s.href ? [s.href] : [])),
    );
    expect(links.filter((h) => h.endsWith('-animation/'))).toHaveLength(6);
  });

  it('treats a bare "project" as "projects"', () => {
    expect(exec('project')).toEqual(exec('projects'));
  });

  it('suggests the closest project for a typo', () => {
    const result = exec('project nebul');
    expect(errors(result)).toBe(1);
    expect(commandsIn(result)).toEqual(['project nebula']);
    expect(commandsIn(exec('project zzz'))).toEqual(['projects']);
  });
});

describe('open', () => {
  it('opens the live demo when there is one, otherwise the repo', () => {
    expect(exec('open vyra').effect).toEqual({
      kind: 'open',
      href: 'https://arslanagayev.github.io/vyra-energy/',
    });
    expect(exec('open lexify').effect).toEqual({
      kind: 'open',
      href: 'https://github.com/arslanagayev/lexify',
    });
  });

  it('opens contact links', () => {
    expect(exec('open github').effect).toEqual({
      kind: 'open',
      href: 'https://github.com/arslanagayev',
    });
    expect(exec('open EMAIL').effect).toEqual({
      kind: 'open',
      href: 'mailto:arslanagayew39@gmail.com',
    });
  });

  it('explains what it can open when the name is unknown or missing', () => {
    for (const input of ['open nowhere', 'open']) {
      const result = exec(input);
      expect(result.effect).toBeUndefined();
      expect(errors(result)).toBe(1);
      expect(textOf(result)).toContain('instagram');
    }
  });
});

describe('neofetch', () => {
  it('puts the logo beside the facts on wide screens', () => {
    const result = exec('neofetch', { columns: 100 });
    expect(result.lines).toHaveLength(7);
    expect(plain(result.lines[0]!)).toMatch(/_\s+user\s+arslan@portfolio/u);
  });

  it('stacks the logo above the facts on narrow screens', () => {
    const result = exec('neofetch', { columns: 40 });
    expect(result.lines).toHaveLength(13);
    expect(textOf(result).split('\n')[0]).toBe('    _        _    ');
    expect(plain(result.lines[6]!)).toMatch(/^user\s+arslan@portfolio$/u);
  });
});

describe('small commands', () => {
  it('ls lists files that cat can print', () => {
    for (const file of commandsIn(exec('ls'))) {
      const result = exec(file);
      expect(errors(result)).toBe(0);
      expect(result.lines.length).toBeGreaterThan(0);
    }
    expect(errors(exec('cat secrets.txt'))).toBe(1);
    expect(errors(exec('cat'))).toBe(1);
  });

  it('history numbers the commands and makes them clickable', () => {
    expect(textOf(exec('history', { history: ['help', 'about'] }))).toBe('  1  help\n  2  about');
    expect(textOf(exec('history'))).toBe('No commands yet.');
  });

  it('echo, date and clear', () => {
    expect(textOf(exec('echo "hello   there" you'))).toBe('hello   there you');
    expect(textOf(exec('date'))).toBe(context.now.toString());
    expect(exec('clear')).toEqual({ lines: [], effect: { kind: 'clear' } });
  });

  it('easter eggs answer but stay out of help', () => {
    for (const egg of ['sudo rm -rf /', 'rm -rf /', 'exit', 'vim']) {
      expect(exec(egg).lines.length).toBeGreaterThan(0);
    }
  });
});

describe('unknown input', () => {
  it('does nothing for a blank line', () => {
    expect(exec('   ')).toEqual({ lines: [] });
  });

  it('suggests the fix and keeps the arguments', () => {
    const result = exec('projct vyra');
    expect(textOf(result)).toContain('command not found: projct');
    expect(commandsIn(result)).toEqual(['project vyra']);
  });

  it('never suggests a hidden command and falls back to help', () => {
    expect(commandsIn(exec('sudp'))).toEqual(['help']);
  });
});

describe('profile data', () => {
  it('has unique project keys that never clash with contact names', () => {
    const keys = [...PROJECTS.map((p) => p.key), ...CONTACT.map((c) => c.key)];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only links to https pages or a mailto address', () => {
    const hrefs = [
      ...CONTACT.map((c) => c.href),
      ...PROJECTS.flatMap((p) => [
        p.repo,
        p.demo ?? 'https://x',
        ...(p.extra ?? []).map((e) => e.href),
      ]),
    ];
    for (const href of hrefs) expect(href).toMatch(/^(https:\/\/|mailto:)/u);
  });
});
