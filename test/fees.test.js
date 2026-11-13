import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lateFee } from '../src/fees.js';
import { lend, openShelf } from '../src/loans.js';

test('a book given back on its due day is charged nothing', () => {
  const loan = lend(openShelf(['b1']), 'b1', 'm1', 100);
  assert.equal(lateFee(loan, loan.dueOn), 0);
});

test('a book given back three days late is charged 75 cents', () => {
  const loan = lend(openShelf(['b1']), 'b1', 'm1', 100);
  assert.equal(lateFee(loan, loan.dueOn + 3), 75);
});
