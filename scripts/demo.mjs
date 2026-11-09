/**
 * Plays this repository's two stories with the tools `npm ci` installed, and
 * shows what each tool prints and how it exits.
 *
 *   npm run demo                    play both stories and print them
 *   npm run readme                  play them, and write what they print into README.md
 *   npm run readme:check            play them, and fail where README.md reads otherwise
 *   npm run story -- <story>        make a story's changes in this checkout, for its branch
 *
 * A story is played in a throwaway repository outside this one: a copy of
 * this checkout's files, committed as `main`, with this checkout's
 * `node_modules` linked in. Nothing here is changed, and every command runs
 * as a reader would type it. A command that exits otherwise than the story
 * expects stops the story, and the run exits 1.
 *
 * README.md holds each story between `<!-- story:<id> -->` and
 * `<!-- /story:<id> -->`. The check compares a commit id and a duration as a
 * kind, not as it reads, since both differ from run to run.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README = path.join(ROOT, 'README.md');
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const lines = (...text) => text.join(NL) + NL;

/** Every commit of a played story is dated this second, so a run writes the commits the last one wrote. */
const DATE = '2026-11-09T12:00:00Z';
const PERSON = { name: 'Pat', email: 'person@example.test' };
const AGENT = { name: 'Agent', email: 'agent@example.test' };

// ---------------------------------------------------------------------------
// The stories
//
// A step is one of:
//   { say }                  a paragraph of the story, in Markdown
//   { run, exit }            a tool's command, shown with its output and exit code
//   { run }                  any other command, shown with its output; it must exit 0
//   { write }                files the agent writes with its editor's tools, which the guard let through
//   { edit }                 the same, as [file, text before, text after] replacements
// A run may also carry `input`, what it reads on stdin, and `show`, the
// command as a reader would type it with that input; `agent`, to commit as
// the agent; and `change`, for a command that changes the story's files,
// which `npm run story` runs too.

const LATE_FEE = lines(
  '/** Cents charged for each day a book is kept past its due day (ADR-0001: whole cents). */',
  'export const FEE_PER_DAY = 25;',
  '',
  '/** The late fee, in cents, for a loan given back on the day `returnedOn`. */',
  'export function lateFee(loan, returnedOn) {',
  '  return Math.max(0, returnedOn - loan.dueOn) * FEE_PER_DAY;',
  '}',
);

const LATE_FEE_TEST = lines(
  "import assert from 'node:assert/strict';",
  "import { test } from 'node:test';",
  "import { lateFee } from '../src/fees.js';",
  "import { lend, openShelf } from '../src/loans.js';",
  '',
  "test('a book given back on its due day is charged nothing', () => {",
  "  const loan = lend(openShelf(['b1']), 'b1', 'm1', 100);",
  '  assert.equal(lateFee(loan, loan.dueOn), 0);',
  '});',
  '',
  "test('a book given back three days late is charged 75 cents', () => {",
  "  const loan = lend(openShelf(['b1']), 'b1', 'm1', 100);",
  '  assert.equal(lateFee(loan, loan.dueOn + 3), 75);',
  '});',
);

const BRIEF = 'briefs/001_charge-a-late-fee.md';
const HOOK_QUESTION = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: 'src/loans.js', content: '…' } });
const SHELL_WRITE = "node -e \"const f = 'src/loans.js'; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('LOAN_DAYS }', 'LOAN_DAYS, fee: 0 }'))\"";

export const STORIES = [
  {
    id: 'write-refused',
    branch: 'story/brief-001-write-refused',
    steps: [
      {
        say:
          '[Brief 001](briefs/001_charge-a-late-fee.md) is active on `main`: a person approved it. Its round may write `src/fees.js` and its test; ' +
          'it must not change `src/loans.js`, the loan record, or anything under `docs/`. The agent works on a branch whose name names the brief:',
      },
      { run: 'git switch -c story/brief-001-write-refused' },
      { say: 'Its plan puts a fee on every loan, in `src/loans.js`. Before a write, the guard says whether the round may make it:' },
      { run: 'npx --no-install @spec-family/spec-harness guard src/fees.js src/loans.js', exit: 1 },
      {
        say:
          'With the hooks `spec-harness init` wrote into [`.claude/settings.json`](.claude/settings.json), Claude Code asks the same before each ' +
          '`Edit`, `Write`, `MultiEdit` and `NotebookEdit`. Its question about a `Write` of `src/loans.js`, the new text left out here, and the answer:',
      },
      { run: 'npx --no-install @spec-family/spec-harness hook claude', input: HOOK_QUESTION, show: `echo '${HOOK_QUESTION}' | npx --no-install @spec-family/spec-harness hook claude`, exit: 0 },
      {
        say:
          'The refusal is the answer\'s `permissionDecision`, which Claude Code reads, and the write is not made; the exit code says only that ' +
          'the hook could answer. So the agent writes `src/fees.js` and `test/fees.test.js`, which the brief allows, ticks the brief\'s boxes, ' +
          'and makes the refused change through the shell, where no hook is asked:',
      },
      { write: { 'src/fees.js': LATE_FEE, 'test/fees.test.js': LATE_FEE_TEST } },
      { edit: [[BRIEF, '- [ ] `lateFee`', '- [x] `lateFee`'], [BRIEF, '- [ ] a book given back on', '- [x] a book given back on'], [BRIEF, '- [ ] a book given back three', '- [x] a book given back three']] },
      { run: SHELL_WRITE, change: true },
      { run: 'git add -A' },
      { run: 'git commit -q -m "Charge a late fee"', agent: true },
      { run: 'git diff --stat main' },
      {
        say:
          'Nothing stopped it: the guard is a guardrail, not a gate. The gate is the audit, which reads the round\'s commits from `main`, ' +
          'whatever wrote them:',
      },
      { run: 'npx --no-install @spec-family/spec-harness audit', exit: 1 },
    ],
  },
  {
    id: 'claim-without-evidence',
    branch: 'story/claim-without-evidence',
    steps: [
      {
        say:
          'No brief this time. An agent reports that loans can be renewed. It raises the promise in [the specification](docs/spec/lending.md) ' +
          'to `Implemented` and writes no test; ticks the item in [the roadmap](ROADMAP.md), naming a commit that was never made; ' +
          'and tells the next agent, in [`AGENTS.md`](AGENTS.md), where the code is:',
      },
      { run: 'git switch -c story/claim-without-evidence' },
      {
        edit: [
          ['docs/spec/lending.md', '- `Specified`: a loan can be renewed once', '- `Implemented`: a loan can be renewed once'],
          ['ROADMAP.md', '- [ ] Renew a loan once ([renewals](docs/spec/lending.md#renew)).', '- [x] Renew a loan once ([renewals](docs/spec/lending.md#renew), commit "Renew a loan once").'],
          ['AGENTS.md', '- The loan desk is `src/loans.js`, and its tests are in `test/`.', '- The loan desk is `src/loans.js`, and its tests are in `test/`.' + NL + '- A loan is renewed by `renew` in `src/renewals.js`.'],
        ],
      },
      { run: 'git diff' },
      { run: 'git commit -q -a -m "Mark renewals done"', agent: true },
      { say: 'Each of the three is a sentence in Markdown, and CI reads each one. spec-guard holds a claim to the evidence its label asks for:' },
      { run: 'npx --no-install @spec-family/spec-guard claims', exit: 1 },
      { say: 'spec-graph holds a ticked item to the commit it names, and an instruction file to the paths it names:' },
      { run: 'npx --no-install @spec-family/spec-graph check', exit: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Playing a story

/** The environment every command runs in: no colour, and nothing outside the story that names a brief or a branch. */
function environment(forReadme) {
  const env = { ...process.env, NO_COLOR: '1', GIT_AUTHOR_DATE: DATE, GIT_COMMITTER_DATE: DATE };
  for (const name of ['FORCE_COLOR', 'SPEC_BRIEF', 'CLAUDE_PROJECT_DIR', 'GITHUB_HEAD_REF', 'GITHUB_REF_NAME', 'GITHUB_REF_TYPE', 'CI_MERGE_REQUEST_SOURCE_BRANCH_NAME', 'CI_COMMIT_BRANCH', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[name];
  // The tools draw their marks in ASCII on Windows unless a terminal that
  // draws them says it is there; the README shows them as every other
  // platform prints them.
  if (forReadme && process.platform === 'win32' && !env.WT_SESSION && !env.TERM_PROGRAM) env.TERM_PROGRAM = 'spec-family-example';
  return env;
}

function git(cwd, env, ...args) {
  const result = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

/** A throwaway repository holding this checkout's files as one commit on `main`, with this checkout's install linked in. */
function makeRepository(env) {
  const home = mkdtempSync(path.join(tmpdir(), 'spec-family-example-'));
  const repo = path.join(home, 'example');
  mkdirSync(repo);
  const files = git(ROOT, env, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split(String.fromCharCode(0)).filter(Boolean);
  for (const file of files) if (existsSync(path.join(ROOT, file))) cpSync(path.join(ROOT, file), path.join(repo, file));
  if (!existsSync(path.join(ROOT, 'node_modules', '@spec-family'))) throw new Error('the tools are not installed here: run npm ci first');
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(repo, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const hooks = path.join(home, 'no-hooks');
  mkdirSync(hooks);
  git(repo, env, 'init', '-q', '-b', 'main');
  for (const [key, value] of [['user.name', PERSON.name], ['user.email', PERSON.email], ['commit.gpgsign', 'false'], ['core.autocrlf', 'false'], ['core.fileMode', 'false'], ['core.hooksPath', hooks]]) git(repo, env, 'config', key, value);
  git(repo, env, 'add', '-A');
  git(repo, env, 'commit', '-q', '-m', 'The loan desk, as this checkout has it');
  return { home, repo };
}

function edit(repo, [file, before, after]) {
  const at = path.join(repo, file);
  const text = readFileSync(at, 'utf8');
  if (!text.includes(before)) throw new Error(`${file} does not read "${before}": the stories are played from main as it should be, and this checkout differs`);
  writeFileSync(at, text.replace(before, after));
}

function write(repo, files) {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    writeFileSync(path.join(repo, file), text);
  }
}

/** Runs a command as a reader would type it, in their shell, with what it prints on either stream. */
function run(repo, env, step) {
  const who = step.agent ? { GIT_AUTHOR_NAME: AGENT.name, GIT_AUTHOR_EMAIL: AGENT.email, GIT_COMMITTER_NAME: AGENT.name, GIT_COMMITTER_EMAIL: AGENT.email } : {};
  const result = spawnSync(step.run, { cwd: repo, env: { ...env, ...who }, input: step.input ?? '', shell: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  const output = (result.stdout + result.stderr)
    .split(NL)
    .map((line) => (line.endsWith(CR) ? line.slice(0, -1) : line))
    .filter((line) => !/^npm (?:notice|warn)/.test(line));
  while (output.length > 0 && output.at(-1) === '') output.pop();
  return { status: result.status, output };
}

/** Plays a story; each step comes back with what its command printed and how it exited. */
export function play(story, { forReadme = false } = {}) {
  const env = environment(forReadme);
  const { home, repo } = makeRepository(env);
  try {
    return story.steps.map((step) => {
      if (step.write) write(repo, step.write);
      if (step.edit) for (const change of step.edit) edit(repo, change);
      if (step.run === undefined) return { step };
      const { status, output } = run(repo, env, step);
      const expected = step.exit ?? 0;
      if (status !== expected) throw new Error(`story ${story.id}: \`${step.run}\` exited ${status}, where the story expects ${expected}:${NL}${output.join(NL)}`);
      return { step, status, output };
    });
  } finally {
    // The link first, on its own, so that nothing it leads to is removed.
    unlinkSync(path.join(repo, 'node_modules'));
    rmSync(home, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Telling it

const FENCE = '```';

/** A played story as Markdown: each paragraph, each command in a console block, and each tool's exit code. */
export function markdown(played) {
  const parts = [];
  let block = null;
  const close = () => {
    if (block !== null) parts.push([`${FENCE}console`, ...block, FENCE].join(NL));
    block = null;
  };
  for (const { step, status, output } of played) {
    if (step.say !== undefined) {
      close();
      parts.push(step.say);
    } else if (step.run !== undefined) {
      block ??= [];
      block.push(`$ ${step.show ?? step.run}`, ...output);
      if (step.exit !== undefined) {
        close();
        parts.push(`Exit \`${status}\`.`);
      }
    }
  }
  close();
  return parts.join(NL + NL);
}

/** The same for a terminal. */
function terminal(played) {
  const out = [];
  for (const { step, status, output } of played) {
    if (step.say !== undefined) out.push('', step.say, '');
    else if (step.run !== undefined) {
      out.push(`$ ${step.show ?? step.run}`, ...output.map((line) => `  ${line}`));
      if (step.exit !== undefined) out.push(`  (exit ${status})`);
    }
  }
  return out.join(NL);
}

const START = (id) => `<!-- story:${id} -->`;
const END = (id) => `<!-- /story:${id} -->`;

/** README.md with each story's part replaced by what it played. */
function withStories(readme, told) {
  let text = readme;
  for (const [id, body] of Object.entries(told)) {
    const from = text.indexOf(START(id));
    const to = text.indexOf(END(id));
    if (from < 0 || to < from) throw new Error(`README.md has no ${START(id)} ... ${END(id)} for the story to go between`);
    text = text.slice(0, from + START(id).length) + NL + NL + body + NL + NL + text.slice(to);
  }
  return text;
}

/** A line as the check compares it: a commit id and a duration are compared as kinds. */
export function normalize(line) {
  return line
    .replace(/(?<![0-9A-Za-z_])[0-9a-f]{7,40}(?![0-9A-Za-z_])/g, '<commit>')
    .replace(/(?<![0-9A-Za-z_.])[0-9]+(?:[.][0-9]+)?m?s(?![0-9A-Za-z_])/g, '<time>');
}

// ---------------------------------------------------------------------------
// Making a story's branch

/** Makes a story's changes in this checkout: the files its agent writes and the commands that change them, no commit. */
function apply(id) {
  const story = STORIES.find((s) => s.id === id || s.branch === id);
  if (story === undefined) throw new Error(`no story is called "${id}": ${STORIES.map((s) => s.id).join(', ')}`);
  const env = environment(false);
  if (git(ROOT, env, 'status', '--porcelain') !== '') throw new Error('this checkout has changes: commit or set them aside first, so the story is all the branch holds');
  for (const step of story.steps) {
    if (step.write) write(ROOT, step.write);
    if (step.edit) for (const change of step.edit) edit(ROOT, change);
    if (step.change) {
      const { status, output } = run(ROOT, env, step);
      if (status !== 0) throw new Error(`\`${step.run}\` exited ${status}:${NL}${output.join(NL)}`);
    }
  }
  process.stdout.write(`made the changes of story ${story.id}; commit them on ${story.branch}${NL}`);
  process.stdout.write(git(ROOT, env, 'status', '--short'));
}

// ---------------------------------------------------------------------------

/** Whether two texts read alike, a commit id and a duration compared as kinds. */
const same = (a, b) => a.split(NL).map(normalize).join(NL) === b.split(NL).map(normalize).join(NL);

/** README.md as the stories play from this checkout, which holds README.md as it reads now. */
function told(mode) {
  const parts = {};
  for (const story of STORIES) {
    const played = play(story, { forReadme: mode !== '--play' });
    if (mode === '--play') process.stdout.write(`${NL}== ${story.branch}${NL}${terminal(played)}${NL}`);
    parts[story.id] = markdown(played);
  }
  return withStories(readFileSync(README, 'utf8'), parts);
}

function main(args) {
  const [mode = '--play', id] = args;
  if (mode === '--apply') return apply(id ?? '');
  if (!['--play', '--write-readme', '--check-readme'].includes(mode)) throw new Error(`unknown option ${mode}`);
  if (mode === '--play') return void told(mode);
  const before = readFileSync(README, 'utf8');
  if (mode === '--write-readme') {
    // spec-graph reads README.md too, so what it prints can change with what
    // was written: play again until the file reads as the stories play.
    for (let round = 1; ; round++) {
      const current = readFileSync(README, 'utf8');
      const next = told(mode);
      if (same(next, current)) break;
      if (round === 3) throw new Error('README.md still changes after three plays; the stories do not settle');
      writeFileSync(README, next);
    }
    process.stdout.write(readFileSync(README, 'utf8') === before ? `README.md already reads as the stories play${NL}` : `wrote the stories into README.md${NL}`);
    return;
  }
  const after = told(mode);
  if (same(after, before)) {
    process.stdout.write(`README.md reads as the stories play${NL}`);
    return;
  }
  const want = after.split(NL).map(normalize);
  const have = before.split(NL).map(normalize);
  const first = want.findIndex((line, index) => line !== have[index]);
  const at = first < 0 ? Math.min(want.length, have.length) : first;
  process.stdout.write(`README.md:${at + 1} no longer reads as the stories play; run npm run readme and commit the result${NL}`);
  process.stdout.write(`  README.md has:  ${have[at] ?? '(the end of the file)'}${NL}`);
  process.stdout.write(`  the story says: ${want[at] ?? '(the end of the file)'}${NL}`);
  process.exitCode = 1;
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`demo: ${error.message}${NL}`);
  process.exitCode = 1;
}
