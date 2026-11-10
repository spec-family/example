# Lending

Status: Accepted

What the loan desk promises. Each promise opens with a label that says how
far it holds: built and tested, or only specified. A promise labelled as
built names the test that holds it, and spec-guard checks that the test is
there and that the check could fail.

<!-- @spec-item id="lend" -->
- `Implemented`: a book on the shelf is lent for 21 days.
  <!-- @assert-count target="test/loans.test.js" symbol="test('a book on the shelf is lent for 21 days'" min="1" -->

<!-- @spec-item id="lend-once" -->
- `Implemented`: a book on loan is not lent again.
  <!-- @assert-count target="test/loans.test.js" symbol="test('a book on loan is not lent again'" min="1" -->

<!-- @spec-item id="give-back" -->
- `Implemented`: a book given back is on the shelf again.
  <!-- @assert-count target="test/loans.test.js" symbol="test('a book given back is on the shelf again'" min="1" -->

<!-- @spec-item id="late-fee" -->
- `Specified`: a book given back after its due day is charged 25 cents for
  each day late.

<!-- @spec-item id="renew" -->
- `Specified`: a loan can be renewed once, for another 21 days.
