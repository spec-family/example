/**
 * Runs the checks CI runs, one after another, and exits with the worst exit
 * code among them: 0 when every one is clean, 1 when one found something, 2
 * when one could not answer.
 *
 * On a branch that names a brief, as `brief/001-...` or `story/brief-001-...`
 * do, it runs the round's audit too; on any other branch no round is under
 * way, and the audit would have no brief to read.
 */

import { spawnSync } from 'node:child_process';

const NL = String.fromCharCode(10);

const CHECKS = [
  'npm test --silent',
  'npx --no-install @spec-family/spec-guard',
  'npx --no-install @spec-family/spec-guard claims',
  'npx --no-install @spec-family/spec-graph check',
  'npx --no-install @spec-family/spec-brief lint',
  'npx --no-install @spec-family/spec-brief matrix',
  'npx --no-install @spec-family/spec-harness premises',
];

// The branch names spec-harness reads a brief from by default: brief/{id},
// brief-{id}, and either after one more name and a slash.
const NAMES_A_BRIEF = /^(?:[^/]+[/])?brief[-/][0-9]/;

const branch = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim();
const checks = NAMES_A_BRIEF.test(branch) ? [...CHECKS, 'npx --no-install @spec-family/spec-harness audit'] : CHECKS;

let worst = 0;
for (const command of checks) {
  process.stdout.write(`${NL}$ ${command}${NL}`);
  const { status } = spawnSync(command, { stdio: 'inherit', shell: true });
  const code = status ?? 2;
  if (code !== 0) process.stdout.write(`(exit ${code})${NL}`);
  worst = Math.max(worst, code === 1 ? 1 : code === 0 ? 0 : 2);
}
process.stdout.write(`${NL}${worst === 0 ? 'every check is clean' : worst === 1 ? 'a check found something' : 'a check could not answer'}${NL}`);
process.exitCode = worst;
