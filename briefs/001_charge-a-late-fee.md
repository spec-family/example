---
status: active
date: 2026-11-09
type: feature
wave: 1
affectedFiles: [src/fees.js, test/fees.test.js]
protectedFiles: [src/loans.js, docs/**]
---

# 001 — Charge a late fee

## Intent

A book given back after its due day is charged 25 cents for each day late,
in whole cents as [ADR-0001](../docs/adr/0001-money-is-whole-cents.md)
requires, computed from the loan as the desk records it today.

## Negative Scope

- No change to how a book is lent or given back.
- No fee for anything but lateness.

## Not Empowered

- `src/loans.js`: the loan record. Every report reads it as it is, and a new
  field on it is a decision of its own.
- `docs/`: the decisions and the specification this round is held to.

## Invariants

- [x] `lateFee` is exported from `src/fees.js`

<!-- @assert-count target="src/fees.js" symbol="export function lateFee" min="1" -->

## Acceptance Criteria

- [x] a book given back on its due day is charged nothing
- [x] a book given back three days late is charged 75 cents
