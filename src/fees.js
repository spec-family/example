/** Cents charged for each day a book is kept past its due day (ADR-0001: whole cents). */
export const FEE_PER_DAY = 25;

/** The late fee, in cents, for a loan given back on the day `returnedOn`. */
export function lateFee(loan, returnedOn) {
  return Math.max(0, returnedOn - loan.dueOn) * FEE_PER_DAY;
}
