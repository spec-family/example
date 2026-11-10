# Working in this repository

Instructions for coding agents. spec-graph holds every path and command named
here to the repository, so this file cannot point at something that is gone.

- The loan desk is `src/loans.js`, and its tests are in `test/`.
- What the desk promises is `docs/spec/lending.md`, and the decisions it keeps
  are in `docs/adr/`. A promise labelled as built names its test.
- Work happens in rounds. A person approves a brief in `briefs/`, which says
  what the round may write and what it must not change, and the round works
  on a branch named for it. Where the guard refuses a write, stop and ask for
  a ruling; never write the file another way.
- Before you commit, run `npm test` and `npm run check`.
