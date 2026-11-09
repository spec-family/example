import assert from 'node:assert/strict';
import { test } from 'node:test';
import { giveBack, lend, openShelf } from '../src/loans.js';

test('a book on the shelf is lent for 21 days', () => {
  const loan = lend(openShelf(['b1']), 'b1', 'm1', 100);
  assert.equal(loan.memberId, 'm1');
  assert.equal(loan.dueOn, 121);
});

test('a book on loan is not lent again', () => {
  const shelf = openShelf(['b1']);
  lend(shelf, 'b1', 'm1', 100);
  assert.throws(() => lend(shelf, 'b1', 'm2', 101), /b1 is on loan/);
});

test('a book given back is on the shelf again', () => {
  const shelf = openShelf(['b1']);
  lend(shelf, 'b1', 'm1', 100);
  assert.equal(giveBack(shelf, 'b1').memberId, 'm1');
  assert.equal(lend(shelf, 'b1', 'm2', 102).memberId, 'm2');
});
