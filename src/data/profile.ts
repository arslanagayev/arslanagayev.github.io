/** Everything the terminal knows about me. Commands only format this data. */

export interface Link {
  readonly label: string;
  readonly href: string;
}

export interface Project {
  /** What you type after `project` or `open`. */
  readonly key: string;
  readonly name: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly stack: readonly string[];
  readonly repo: string;
  readonly demo?: string;
  readonly extra?: readonly Link[];
}

export const PROFILE = {
  name: 'Arslan Agayev',
  handle: 'arslan',
  role: 'Software developer · Computer Science student',
  school: 'Hangzhou Normal University',
  location: 'Hangzhou, China',
  status: 'Open to software engineering internships for 2027',
  about: [
    "I'm a third-year Computer Science student who likes building complete systems,",
    'from firmware and backends all the way to the screen people use.',
    'I build fast with AI tools, and I make sure I can explain every line I ship.',
    'I also make short videos about how technology actually works.',
  ],
} as const;

export const CONTACT: readonly (Link & { key: string })[] = [
  { key: 'email', label: 'arslanagayew39@gmail.com', href: 'mailto:arslanagayew39@gmail.com' },
  { key: 'github', label: 'github.com/arslanagayev', href: 'https://github.com/arslanagayev' },
  {
    key: 'instagram',
    label: 'instagram.com/arslanagayev.dev',
    href: 'https://www.instagram.com/arslanagayev.dev/',
  },
  {
    key: 'tiktok',
    label: 'tiktok.com/@arslanagayev.dev',
    href: 'https://www.tiktok.com/@arslanagayev.dev',
  },
];

export const SKILLS: readonly { group: string; items: readonly string[] }[] = [
  {
    group: 'Languages',
    items: ['TypeScript', 'JavaScript', 'Python', 'C#', 'C', 'C++', 'Java', 'SQL'],
  },
  { group: 'Frontend', items: ['HTML', 'CSS', 'React', 'Three.js', 'GLSL', 'GSAP', 'Vite'] },
  { group: 'Backend', items: ['ASP.NET Core', 'FastAPI', 'Node.js', 'SQLite', 'REST'] },
  { group: 'Tooling', items: ['Git', 'GitHub Actions', 'Vitest', 'Docker', 'Figma', 'ffmpeg'] },
  { group: 'Learning next', items: ['Embedded systems', 'Arduino', 'Raspberry Pi'] },
];

const gh = (repo: string): string => `https://github.com/arslanagayev/${repo}`;
const pages = (repo: string): string => `https://arslanagayev.github.io/${repo}/`;

export const PROJECTS: readonly Project[] = [
  {
    key: 'vyra',
    name: 'VYRA Energy',
    summary: 'Scroll-driven 3D product site for a fictional energy drink',
    details: [
      'Five cans rise, spin and line up as you scroll through the page.',
      'Each can is 17 points of code spun into shape with LatheGeometry: no 3D model files.',
      'Labels are painted on a canvas; 163 tests; deployed by GitHub Actions.',
    ],
    stack: ['TypeScript', 'Three.js', 'GSAP ScrollTrigger', 'Lenis', 'Vite'],
    repo: gh('vyra-energy'),
    demo: pages('vyra-energy'),
  },
  {
    key: 'nebula',
    name: 'Nebula Auth',
    summary: 'A 3D sign-in page over a 30,000-star WebGL galaxy',
    details: [
      'The galaxy reacts to typing, password strength and the login result.',
      'Custom GLSL shaders, accessible form, 240 tests and CI/CD to GitHub Pages.',
    ],
    stack: ['TypeScript', 'Three.js', 'GLSL', 'Vite', 'Vitest'],
    repo: gh('nebula-auth'),
    demo: pages('nebula-auth'),
  },
  {
    key: 'explainer',
    name: 'Explainer Engine',
    summary: 'Turns a script and a voice-over into a 9:16 explainer video',
    details: [
      'SVG scenes are pure functions of time; captions are synced word by word.',
      'Frames are captured through the Chrome DevTools Protocol and mixed with ffmpeg.',
      'Renders my "How it actually works" and "How languages actually work" series.',
    ],
    stack: ['JavaScript', 'SVG', 'Node.js', 'Python', 'ffmpeg'],
    repo: gh('explainer-engine'),
  },
  {
    key: 'animations',
    name: 'UI micro-interactions',
    summary: 'Six animated components, each with its own style and live demo',
    details: [
      'Plain HTML, CSS and the Web Animations API, no libraries.',
      'Every one has a different look: glass, clay, paper, CRT, Swiss and a receipt printer.',
    ],
    stack: ['HTML', 'CSS', 'JavaScript', 'Figma Motion'],
    repo: 'https://github.com/arslanagayev?tab=repositories&q=animation',
    extra: [
      { label: 'OTP verify', href: pages('otp-verify-animation') },
      { label: 'Delete file', href: pages('delete-file-animation') },
      { label: 'Send file', href: pages('send-file-animation') },
      { label: 'Deploy button', href: pages('deploy-button-animation') },
      { label: 'Download button', href: pages('download-button-animation') },
      { label: 'Payment receipt', href: pages('payment-receipt-animation') },
    ],
  },
  {
    key: 'lexify',
    name: 'Lexify',
    summary: 'AI-powered English vocabulary platform with a Telegram assistant',
    details: [
      'Words come with real news examples, translations and etymology.',
      'SM-2 spaced repetition, quizzes and a Telegram bot.',
    ],
    stack: ['React', 'FastAPI', 'SQLite', 'DeepSeek API', 'Telegram'],
    repo: gh('lexify'),
  },
  {
    key: 'passwords',
    name: 'Password Manager',
    summary: 'Desktop password vault with local storage',
    details: ['A dark-themed WPF app that stores entries in a local SQLite database.'],
    stack: ['C#', 'WPF', '.NET 8', 'SQLite'],
    repo: gh('password-manager-desktop'),
  },
  {
    key: 'tasks',
    name: 'Task Manager API',
    summary: 'My first ASP.NET Core REST API',
    details: ['Create and list tasks over HTTP, documented with Swagger.'],
    stack: ['C#', 'ASP.NET Core', 'Swagger'],
    repo: gh('task-manager-api'),
  },
];
