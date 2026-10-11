import { CONTACT, PROFILE, PROJECTS, SKILLS, type Project } from '../data/profile';
import { blank, cmd, line, link, pad, seg, text, type Line, type Result } from './output';
import { parse } from './parse';
import { suggest } from './suggest';

export interface Context {
  readonly history: readonly string[];
  readonly now: Date;
  /** How many characters fit on one line, like $COLUMNS in a real shell. */
  readonly columns: number;
}

export interface Command {
  readonly name: string;
  readonly usage?: string;
  readonly description: string;
  /** Easter eggs work but are left out of `help` and completion. */
  readonly hidden?: boolean;
  /** Values offered by tab completion for the first argument. */
  readonly completions?: readonly string[];
  run(args: readonly string[], context: Context): Result;
}

const out = (...lines: Line[]): Result => ({ lines });

/** Files that `ls` shows and `cat` prints; each one is a shortcut to a command. */
const FILES: Readonly<Record<string, string>> = {
  'about.txt': 'about',
  'skills.txt': 'skills',
  'contact.txt': 'contact',
  'projects/': 'projects',
};

const MONOGRAM = [
  '    _        _    ',
  '   / \\      / \\   ',
  '  / _ \\    / _ \\  ',
  ' / ___ \\  / ___ \\ ',
  '/_/   \\_\\/_/   \\_\\',
];

function findProject(key: string | undefined): Project | undefined {
  const wanted = key?.toLowerCase();
  return PROJECTS.find((p) => p.key === wanted || p.name.toLowerCase() === wanted);
}

function projectDetails(p: Project): Line[] {
  const lines: Line[] = [
    line(seg(p.name, 'strong'), seg(`  ${p.summary}`, 'muted')),
    blank,
    ...p.details.map((d) => text(`  ${d}`)),
    blank,
    line(seg(pad('  stack', 10), 'muted'), seg(p.stack.join(' · '))),
    line(seg(pad('  code', 10), 'muted'), link(p.repo.replace('https://', ''), p.repo)),
  ];
  if (p.demo)
    lines.push(line(seg(pad('  demo', 10), 'muted'), link(p.demo.replace('https://', ''), p.demo)));
  for (const extra of p.extra ?? []) {
    lines.push(line(seg(pad('  ↳', 10), 'muted'), link(extra.label, extra.href)));
  }
  return lines;
}

const contactKeys = CONTACT.map((c) => c.key);

const LIST: readonly Command[] = [
  {
    name: 'help',
    description: 'list the commands',
    run: (): Result => {
      const visible = COMMANDS.filter((c) => !c.hidden);
      const width = Math.max(...visible.map((c) => (c.usage ?? c.name).length)) + 3;
      return out(
        text('Commands (click one, or type it and press Enter):', 'muted'),
        blank,
        ...visible.map((c) =>
          line(
            cmd(c.name, c.usage ?? c.name),
            seg(' '.repeat(width - (c.usage ?? c.name).length)),
            seg(c.description, 'muted'),
          ),
        ),
        blank,
        text('Tab completes, ↑ ↓ walk through history, Ctrl+L clears the screen.', 'muted'),
      );
    },
  },
  {
    name: 'about',
    description: 'who I am',
    run: () =>
      out(
        line(seg(PROFILE.name, 'strong'), seg(` · ${PROFILE.role}`, 'muted')),
        blank,
        ...PROFILE.about.map((l) => text(l)),
        blank,
        line(seg('→ ', 'accent'), seg(PROFILE.status)),
        line(seg('→ ', 'accent'), seg('See what I built: '), cmd('projects')),
      ),
  },
  {
    name: 'projects',
    description: 'things I have built',
    run: (): Result => {
      const width = Math.max(...PROJECTS.map((p) => p.key.length)) + 3;
      return out(
        ...PROJECTS.map((p) =>
          line(
            cmd(`project ${p.key}`, p.key),
            seg(' '.repeat(width - p.key.length)),
            seg(p.name, 'strong'),
            seg(` · ${p.summary}`, 'muted'),
          ),
        ),
        blank,
        line(
          seg('Details: ', 'muted'),
          seg('project <name>', 'accent'),
          seg('   Open the live demo: ', 'muted'),
          seg('open <name>', 'accent'),
        ),
      );
    },
  },
  {
    name: 'project',
    usage: 'project <name>',
    description: 'details of one project',
    completions: PROJECTS.map((p) => p.key),
    run: ([name]: readonly string[], context: Context): Result => {
      // A bare `project` is almost always a half-typed `projects`, so show the list.
      if (!name) return run('projects', context);
      const p = findProject(name);
      if (p) return out(...projectDetails(p));
      const hint = suggest(
        name,
        PROJECTS.map((x) => x.key),
      );
      return out(
        text(`project: no project called "${name}"`, 'error'),
        hint
          ? line(seg('Did you mean '), cmd(`project ${hint}`), seg('?'))
          : line(seg('Try '), cmd('projects'), seg(' to see them all.')),
      );
    },
  },
  {
    name: 'open',
    usage: 'open <name>',
    description: 'open a demo, repo or profile in a new tab',
    completions: [...PROJECTS.map((p) => p.key), ...contactKeys],
    run: ([name]: readonly string[]): Result => {
      const project = findProject(name);
      const contact = CONTACT.find((c) => c.key === name?.toLowerCase());
      const href = project ? (project.demo ?? project.repo) : contact?.href;
      if (!href) {
        return out(
          text(name ? `open: nothing called "${name}"` : 'usage: open <name>', 'error'),
          line(seg('Try a project name, or one of: '), seg(contactKeys.join(', '), 'accent')),
        );
      }
      return {
        lines: [
          line(
            seg('Opening '),
            link(href.replace(/^(https:\/\/|mailto:)/u, ''), href),
            seg(' …', 'muted'),
          ),
        ],
        effect: { kind: 'open', href },
      };
    },
  },
  {
    name: 'skills',
    description: 'languages and tools I use',
    run: (): Result => {
      const width = Math.max(...SKILLS.map((s) => s.group.length)) + 3;
      return out(
        ...SKILLS.map((s) => line(seg(pad(s.group, width), 'accent'), seg(s.items.join(' · ')))),
      );
    },
  },
  {
    name: 'contact',
    description: 'how to reach me',
    run: (): Result => {
      const width = Math.max(...contactKeys.map((k) => k.length)) + 3;
      return out(
        ...CONTACT.map((c) => line(seg(pad(c.key, width), 'muted'), link(c.label, c.href))),
        blank,
        text(PROFILE.status, 'strong'),
      );
    },
  },
  {
    name: 'neofetch',
    description: 'a quick summary card',
    run: (_: readonly string[], { columns }: Context): Result => {
      const facts: [string, string][] = [
        ['user', `${PROFILE.handle}@portfolio`],
        ['role', PROFILE.role],
        ['school', PROFILE.school],
        ['location', PROFILE.location],
        ['projects', `${PROJECTS.length} on GitHub`],
        ['stack', 'TypeScript · Python · C# · C/C++'],
        ['status', 'open to 2027 internships'],
      ];
      const factLines = facts.map(([key, value]) => line(seg(pad(key, 10), 'accent'), seg(value)));
      // Narrow screens get the logo above the facts instead of beside them.
      if (columns < 64) return out(...MONOGRAM.map((m) => text(m, 'accent')), blank, ...factLines);
      const rows = Math.max(MONOGRAM.length, facts.length);
      return out(
        ...Array.from({ length: rows }, (_, i) => {
          const fact = facts[i];
          return line(
            seg(pad(MONOGRAM[i] ?? '', 22), 'accent'),
            ...(fact ? [seg(pad(fact[0], 10), 'accent'), seg(fact[1])] : []),
          );
        }),
      );
    },
  },
  {
    name: 'ls',
    description: 'list files',
    run: () => out(line(...Object.keys(FILES).flatMap((f) => [cmd(`cat ${f}`, f), seg('   ')]))),
  },
  {
    name: 'cat',
    usage: 'cat <file>',
    description: 'print a file',
    completions: Object.keys(FILES),
    run: ([file]: readonly string[], context: Context): Result => {
      const target = file ? FILES[file] : undefined;
      const command = COMMANDS.find((c) => c.name === target);
      if (command) return command.run([], context);
      return out(
        text(file ? `cat: ${file}: No such file` : 'usage: cat <file>', 'error'),
        line(seg('Try '), cmd('ls'), seg('.')),
      );
    },
  },
  {
    name: 'whoami',
    description: 'you, the visitor',
    run: () => out(line(seg('guest. Welcome! Type '), cmd('about'), seg(' to see who I am.'))),
  },
  {
    name: 'history',
    description: 'commands you have run',
    run: (_, { history }) =>
      history.length
        ? out(
            ...history.map((h, i) => line(seg(`${String(i + 1).padStart(3)}  `, 'muted'), cmd(h))),
          )
        : out(text('No commands yet.', 'muted')),
  },
  {
    name: 'date',
    description: 'the current date and time',
    run: (_, { now }) => out(text(now.toString())),
  },
  {
    name: 'echo',
    usage: 'echo <text>',
    description: 'print some text',
    run: (args) => out(text(args.join(' '))),
  },
  {
    name: 'clear',
    description: 'clear the screen',
    run: () => ({ lines: [], effect: { kind: 'clear' } }),
  },
  {
    name: 'sudo',
    hidden: true,
    description: 'nice try',
    run: () =>
      out(
        text('guest is not in the sudoers file. This incident will be reported.', 'error'),
        line(seg('You can still '), cmd('contact'), seg(' me though.')),
      ),
  },
  {
    name: 'rm',
    hidden: true,
    description: 'no',
    run: () => out(text('rm: permission denied. This portfolio took a while to build.', 'error')),
  },
  {
    name: 'exit',
    hidden: true,
    description: 'there is no exit',
    run: () => out(text('There is no exit. Only more projects:'), line(cmd('projects'))),
  },
  {
    name: 'vim',
    hidden: true,
    description: 'trapped',
    run: () =>
      out(line(seg('You are now stuck in vim. Just kidding, type '), cmd('help'), seg('.'))),
  },
];

export const COMMANDS: readonly Command[] = LIST;

const VISIBLE = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);

/** Runs one command line and returns what the terminal should print or do. */
export function run(input: string, context: Context): Result {
  const { name, args } = parse(input);
  if (!name) return { lines: [] };
  const command = COMMANDS.find((c) => c.name === name);
  if (command) return command.run(args, context);

  const hint = suggest(name, VISIBLE);
  const fixed = hint ? [hint, ...args].join(' ') : undefined;
  return out(
    text(`command not found: ${name}`, 'error'),
    fixed
      ? line(seg('Did you mean '), cmd(fixed), seg('?'))
      : line(seg('Type '), cmd('help'), seg(' to see what I understand.')),
  );
}
