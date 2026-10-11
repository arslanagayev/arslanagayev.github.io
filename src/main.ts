import '@fontsource-variable/jetbrains-mono';
import './style.css';
import { cmd, line, seg, text } from './core/output';
import { Terminal } from './ui/terminal';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const terminal = new Terminal(document, { typingDelay: reducedMotion ? 0 : 45 });

terminal.print([
  text("Welcome! This is Arslan Agayev's portfolio, as a terminal.", 'strong'),
  line(
    seg('Type '),
    cmd('help'),
    seg(' or tap a command below. Start with '),
    cmd('projects'),
    seg(' if you are in a hurry.'),
  ),
]);
terminal.focus();

// A link like ?run=projects types that command after the intro, so a CV can point straight at
// a section. `open` is left out because pop-ups should only come from a click.
const deepLink = new URLSearchParams(window.location.search).get('run')?.trim();
const allowed = deepLink && !/^open\b/iu.test(deepLink) ? deepLink.slice(0, 60) : undefined;

void (async () => {
  await terminal.typeAndRun('neofetch');
  if (allowed) await terminal.typeAndRun(allowed);
})();
