/**
 * The loan desk: which book is lent to whom, and until which day.
 *
 * A day is a whole number the caller counts (docs/adr/0002-the-desk-reads-no-clock.md).
 */

/** How many days a book is lent for. */
export const LOAN_DAYS = 21;

/** A shelf of books, by id; none of them is on loan yet. */
export function openShelf(bookIds) {
  return { onShelf: new Set(bookIds), loans: new Map() };
}

/** Lends a book that is on the shelf, and refuses one that is not. */
export function lend(shelf, bookId, memberId, today) {
  if (!shelf.onShelf.has(bookId)) {
    throw new Error(shelf.loans.has(bookId) ? `${bookId} is on loan` : `${bookId} is not on this shelf`);
  }
  const loan = { bookId, memberId, lentOn: today, dueOn: today + LOAN_DAYS };
  shelf.onShelf.delete(bookId);
  shelf.loans.set(bookId, loan);
  return loan;
}

/** Takes a book back and puts it on the shelf again; returns its loan. */
export function giveBack(shelf, bookId) {
  const loan = shelf.loans.get(bookId);
  if (loan === undefined) throw new Error(`${bookId} is not on loan`);
  shelf.loans.delete(bookId);
  shelf.onShelf.add(bookId);
  return loan;
}
