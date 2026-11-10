---
status: accepted
---

# ADR-0001: Money is whole cents

## Context

The desk will charge fees. A fee computed in floating point can come out a
fraction of a cent off, and a fee written as a decimal string invites
parsing it back as one.

## Decision

Every amount of money the desk computes is a whole number of cents. No code
in `src/` parses or formats an amount as a decimal.

<!-- @assert-absence target="src" glob="*.js" symbol="parseFloat" reason="money is whole cents" -->
<!-- @assert-absence target="src" glob="*.js" symbol="toFixed" reason="money is whole cents" -->
