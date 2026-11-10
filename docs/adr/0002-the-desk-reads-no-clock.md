---
status: accepted
---

# ADR-0002: The desk reads no clock

## Context

A due day computed from the clock makes every rule about lateness depend on
when its test runs.

## Decision

A day is a whole number the caller counts and hands to the desk. No code in
`src/` reads the date or the time, so a loan's due day is plain arithmetic
and every rule is tested without a clock.

<!-- @assert-absence target="src" glob="*.js" symbol="Date" word="true" reason="the desk reads no clock" -->
