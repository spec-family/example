# spec-family example

A lending library small enough to read in a few minutes, kept to its
documents by the [spec-family](https://github.com/spec-family) tools. Two
stories show what they catch. Each is told below with what the tools print,
and each is a pull request left open, red in CI for that story alone:

1. **A write refused** ([#2](https://github.com/spec-family/example/pull/2)).
   A brief protects the loan record. An agent's write there is refused; its
   write through the shell is not, and the audit finds it at the end of the
   round.
2. **A claim without evidence** ([#3](https://github.com/spec-family/example/pull/3)).
   A promise marked `Implemented` with no test behind it, a roadmap item
   ticked for a commit that was never made, and agent instructions that name
   a file that does not exist. CI catches each.

## Run it

```bash
git clone https://github.com/spec-family/example.git
cd example
npm ci
npm run demo
```

It needs Node 22 or later and git. `npm ci` installs the four tools at the
versions `package-lock.json` pins, and nothing else: the library itself has
no dependencies. `npm run demo` plays both stories in a throwaway copy of the
checkout, outside it, and prints each command, what it printed and how it
exited. It changes nothing in the checkout and takes a few seconds.

## The repository

```text
src/loans.js                      the loan desk: lend a book, take it back
test/loans.test.js                its tests, run by node --test
docs/adr/                         two decisions, each held to the code by spec-guard
docs/spec/lending.md              what the desk promises, each promise labelled
ROADMAP.md                        what it does and will do; spec-graph holds each ticked item
AGENTS.md, CLAUDE.md              instructions for coding agents; spec-graph holds what they name
briefs/001_charge-a-late-fee.md   the active brief: one round of agent work, approved by a person
.spec-*.json                      each tool's configuration
.claude/settings.json, .mcp.json  the guard's hooks and MCP server, as spec-harness init wrote them
.github/workflows/specs.yml       CI
scripts/demo.mjs                  plays the stories, and writes and checks them in this README
scripts/check.mjs                 npm run check: the checks CI runs, on this checkout
```

The four tools are deterministic and have no dependencies:

| Tool | Holds |
| --- | --- |
| [spec-guard](https://github.com/spec-family/spec-guard) ([npm](https://www.npmjs.com/package/@spec-family/spec-guard)) | the code to the rules the documents state, and each claim to the evidence its label asks for |
| [spec-graph](https://github.com/spec-family/spec-graph) ([npm](https://www.npmjs.com/package/@spec-family/spec-graph)) | the documents to each other and to the repository: links, ticked items, commits, paths |
| [spec-brief](https://github.com/spec-family/spec-brief) ([npm](https://www.npmjs.com/package/@spec-family/spec-brief)) | the briefs: their sections, scopes and waves |
| [spec-harness](https://github.com/spec-family/spec-harness) ([npm](https://www.npmjs.com/package/@spec-family/spec-harness)) | a round of agent work to its brief: the guard before each write, the audit at the end |

Every command gives `npx` the package's full name and `--no-install`, so it
runs the install `npm ci` made and never fetches a package of a similar name.

## Story 1: a write refused

<!-- story:write-refused -->

[Brief 001](briefs/001_charge-a-late-fee.md) is active on `main`: a person approved it. Its round may write `src/fees.js` and its test; it must not change `src/loans.js`, the loan record, or anything under `docs/`. The agent works on a branch whose name names the brief:

```console
$ git switch -c story/brief-001-write-refused
Switched to a new branch 'story/brief-001-write-refused'
```

Its plan puts a fee on every loan, in `src/loans.js`. Before a write, the guard says whether the round may make it:

```console
$ npx --no-install @spec-family/spec-harness guard src/fees.js src/loans.js
ok       src/fees.js is in brief 001's scope (src/fees.js)
refused  brief 001 does not empower this round to change src/loans.js (protectedFiles: src/loans.js)
         if the round cannot be done without it, stop and ask for a ruling: spec-harness escalate --path <file> --reason <why>, or the request_escalation tool
```

Exit `1`.

With the hooks `spec-harness init` wrote into [`.claude/settings.json`](.claude/settings.json), Claude Code asks the same before each `Edit`, `Write`, `MultiEdit` and `NotebookEdit`. Its question about a `Write` of `src/loans.js`, the new text left out here, and the answer:

```console
$ echo '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"src/loans.js","content":"…"}}' | npx --no-install @spec-family/spec-harness hook claude
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"spec-harness: brief 001 does not empower this round to change src/loans.js (protectedFiles: src/loans.js). Next: if the round cannot be done without it, stop and ask for a ruling: spec-harness escalate --path <file> --reason <why>, or the request_escalation tool."}}
```

Exit `0`.

The refusal is the answer's `permissionDecision`, which Claude Code reads, and the write is not made; the exit code says only that the hook could answer. So the agent writes `src/fees.js` and `test/fees.test.js`, which the brief allows, ticks the brief's boxes, and makes the refused change through the shell, where no hook is asked:

```console
$ node -e "const f = 'src/loans.js'; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('LOAN_DAYS }', 'LOAN_DAYS, fee: 0 }'))"
$ git add -A
$ git commit -q -m "Charge a late fee"
$ git diff --stat main
 briefs/001_charge-a-late-fee.md |  6 +++---
 src/fees.js                     |  7 +++++++
 src/loans.js                    |  2 +-
 test/fees.test.js               | 14 ++++++++++++++
 4 files changed, 25 insertions(+), 4 deletions(-)
```

Nothing stopped it: the guard is a guardrail, not a gate. The gate is the audit, which reads the round's commits from `main`, whatever wrote them:

```console
$ npx --no-install @spec-family/spec-harness audit
audit of brief 001 from main (e28c469b85ce)

error    briefs/001_charge-a-late-fee.md:7  the round changed src/loans.js, which this brief protects  archive/protected-file
         revert the change, or record the departure in the brief before archiving it

measured: goals: 1 held, 0 failed · premises: none declared · archive: asked · rulings: none · dependencies: 0 changed, 0 unread
1 error(s), 0 warning(s), 0 note(s)
```

Exit `1`.

<!-- /story:write-refused -->

In CI, the `round` job runs the audit on a brief's branch. Pull request
[#2](https://github.com/spec-family/example/pull/2), from
`story/brief-001-write-refused`, is red there and nowhere else: the tests
pass, and so does every other check.

With git's pre-commit hook installed (`spec-harness init --git-hook --write`),
the commit itself is refused, for any agent or none. The hook lives on one
machine and `git commit --no-verify` skips it, so the audit stays the gate.

## Story 2: a claim without evidence

<!-- story:claim-without-evidence -->

No brief this time. An agent reports that loans can be renewed. It raises the promise in [the specification](docs/spec/lending.md) to `Implemented` and writes no test; ticks the item in [the roadmap](ROADMAP.md), naming a commit that was never made; and tells the next agent, in [`AGENTS.md`](AGENTS.md), where the code is:

```console
$ git switch -c story/claim-without-evidence
Switched to a new branch 'story/claim-without-evidence'
$ git diff
diff --git a/AGENTS.md b/AGENTS.md
index 526cd58..51121d8 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -4,6 +4,7 @@ Instructions for coding agents. spec-graph holds every path and command named
 here to the repository, so this file cannot point at something that is gone.
 
 - The loan desk is `src/loans.js`, and its tests are in `test/`.
+- A loan is renewed by `renew` in `src/renewals.js`.
 - What the desk promises is `docs/spec/lending.md`, and the decisions it keeps
   are in `docs/adr/`. A promise labelled as built names its test.
 - Work happens in rounds. A person approves a brief in `briefs/`, which says
diff --git a/ROADMAP.md b/ROADMAP.md
index 28b54fe..322d746 100644
--- a/ROADMAP.md
+++ b/ROADMAP.md
@@ -8,4 +8,4 @@ that did the work, and spec-graph holds it to that.
 - [x] Never lend a book twice ([lending once](docs/spec/lending.md#lend-once)).
 - [x] Take a book back ([giving back](docs/spec/lending.md#give-back)).
 - [ ] Charge a late fee ([late fees](docs/spec/lending.md#late-fee)): brief 001.
-- [ ] Renew a loan once ([renewals](docs/spec/lending.md#renew)).
+- [x] Renew a loan once ([renewals](docs/spec/lending.md#renew), commit "Renew a loan once").
diff --git a/docs/spec/lending.md b/docs/spec/lending.md
index e69a8b6..2b623b9 100644
--- a/docs/spec/lending.md
+++ b/docs/spec/lending.md
@@ -24,4 +24,4 @@ there and that the check could fail.
   each day late.
 
 <!-- @spec-item id="renew" -->
-- `Specified`: a loan can be renewed once, for another 21 days.
+- `Implemented`: a loan can be renewed once, for another 21 days.
$ git commit -q -a -m "Mark renewals done"
```

Each of the three is a sentence in Markdown, and CI reads each one. spec-guard holds a claim to the evidence its label asks for:

```console
$ npx --no-install @spec-family/spec-guard claims
spec-guard claims 1 document

✖ docs/spec/lending.md:27  `Implemented` needs a test, and no directive under the claim names one (test(')  unevidenced-claim
    hint: write a directive under the claim that counts the test, as <!-- @assert-count target="..." symbol="fn test_..." min="1" -->, or lower the label

options from .spec-guard.json: claims

5 claims: Implemented 4, Specified 1 · 19ms
✖ 1 claim finding
```

Exit `1`.

spec-graph holds a ticked item to the commit it names, and an instruction file to the paths it names:

```console
$ npx --no-install @spec-family/spec-graph check
spec-graph 8 documents · 13 items · 24 relations · 5 open

✖ AGENTS.md:7:35  missing-path
    `src/renewals.js` names no file or directory the repository holds
    → correct it, or mark it in the document: <!-- @spec-path created="src/renewals.js" --> for one this work creates, external="src/renewals.js" for one in another repository

✖ ROADMAP.md:11:66  unknown-commit
    commit "Renew a loan once" is not in the history of HEAD
    → name a commit HEAD reaches, by its subject as written or by the start of its hash

2 errors · 167.47ms
✖ the specification graph is inconsistent
```

Exit `1`.

<!-- /story:claim-without-evidence -->

In CI, both run in the `specs` job, which is red on pull request
[#3](https://github.com/spec-family/example/pull/3), from
`story/claim-without-evidence`, for these three findings and nothing else.

## In CI

[`.github/workflows/specs.yml`](.github/workflows/specs.yml) runs on every
pull request and every push to `main`, and reads the repository only:

| Job | Runs | Red on |
| --- | --- | --- |
| `specs` | `npm test`, `spec-guard`, `spec-guard claims`, `spec-graph check`, `spec-brief lint`, `spec-brief matrix` | story 2 |
| `round` | `spec-harness premises`, and `spec-harness audit` on a brief's branch | story 1 |
| `readme` | `npm run readme:check`: this README against the stories as they play | neither: it skips a story's branch, which already holds its story |

`main` is green. Each check writes its findings with `--format github`, which
GitHub shows as annotations on the pull request's lines. The checkout keeps
the whole history (`fetch-depth: 0`): spec-graph looks in git for the commits
a checklist names, and stops with exit 2 in a shallow clone rather than
guess; spec-harness measures a round from `main`. Locally, `npm run check`
runs the same checks one after another.

## What this does not show

- A ruling: a person's signed permission for one round to change a file its
  brief protects. The [tutorial](https://github.com/spec-family/spec-core/blob/main/docs/tutorial.md)
  goes through one.
- Agents other than Claude Code before a write. The hooks are written for
  it; any agent can ask `spec-harness guard <path>` or the MCP server's
  `check_path`, and git's pre-commit hook and the audit hold every agent alike.
- Whether the documents ask for the right thing. The tools check that the
  code keeps the promises the documents make; the promises are a person's.

## Keeping this README true

The two stories above are written by `npm run readme`, which plays them and
puts what they print between their markers. CI's `readme` job plays them
again and fails where this file no longer reads as they play. A commit id
and a duration are compared as kinds, since both differ from run to run. To
change a story, change it in `scripts/demo.mjs` and run `npm run readme`.

Each story's branch is `main` with the story's changes. To make it again
after `main` moves:

```bash
git switch -C story/brief-001-write-refused main
npm run story -- write-refused
git add -A
git commit -m "Charge a late fee"
```

```bash
git switch -C story/claim-without-evidence main
npm run story -- claim-without-evidence
git commit -a -m "Mark renewals done"
```

## Further

- [Tutorial](https://github.com/spec-family/spec-core/blob/main/docs/tutorial.md):
  one round, start to finish, with a ruling and the archive.
- [Adopting](https://github.com/spec-family/spec-core/blob/main/docs/adopting.md):
  installing the tools, CI on GitHub and GitLab, and the settings that matter
  when agents write the code.
- [Concepts](https://github.com/spec-family/spec-core/blob/main/docs/concepts.md):
  the words used here.
- Each tool's reference is in `docs/reference/` of its repository, and in its
  npm package.

## License

MIT; the text is in `LICENSE`.
