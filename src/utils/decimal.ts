/**
 * Generated from COBOL COMP-3 packed decimal conventions — CardDemo TypeScript migration
 * Original COBOL program: Shared utility for COMP-3 / packed decimal arithmetic
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * IMPORTANT: All monetary and high-precision numeric fields in CardDemo use COBOL COMP-3
 * (packed-decimal) storage. Native JavaScript `number` (IEEE-754 double) cannot represent
 * these values exactly. Use Decimal.js (or the `decimal.js` npm package) for all arithmetic
 * on these fields. Never use `+`, `-`, `*`, `/` directly on currency amounts.
 *
 * Usage:
 *   import { toDecimal, addDecimal, formatCurrency } from './utils/decimal';
 *   const bal = toDecimal(account.currentBalance);
 *   const newBal = addDecimal(bal, toDecimal(payment.amount));
 */

import Decimal from 'decimal.js';

// Configure Decimal.js to match COBOL fixed-decimal semantics:
// - No exponential notation for display
// - Round half-up (matches COBOL ROUNDED default)
Decimal.set({ toExpPos: 20, toExpNeg: -7, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convert a string, number, or undefined value to a Decimal instance.
 * Use this as the entry point whenever reading a COMP-3 field from the database
 * or from an input DTO.
 */
export function toDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  return new Decimal(value);
}

/**
 * Add two Decimal values (replaces COBOL ADD statement).
 */
export function addDecimal(a: Decimal, b: Decimal): Decimal {
  return a.plus(b);
}

/**
 * Subtract b from a (replaces COBOL SUBTRACT statement).
 */
export function subtractDecimal(a: Decimal, b: Decimal): Decimal {
  return a.minus(b);
}

/**
 * Multiply two Decimal values (replaces COBOL MULTIPLY statement).
 */
export function multiplyDecimal(a: Decimal, b: Decimal): Decimal {
  return a.times(b);
}

/**
 * Divide a by b (replaces COBOL DIVIDE statement).
 * Throws if b is zero (matches COBOL ON SIZE ERROR behavior).
 */
export function divideDecimal(a: Decimal, b: Decimal): Decimal {
  if (b.isZero()) {
    throw new Error('Division by zero (COBOL ON SIZE ERROR)');
  }
  return a.dividedBy(b);
}

/**
 * Apply an annual interest rate to a balance for one cycle.
 * Equivalent to: COMPUTE interest-charge = balance * (rate / 100) / 12
 *
 * This is the pattern used in CBACT04C (interest calculation batch).
 * COMP-3 fields require Decimal.js — never use native / or *.
 */
export function computeMonthlyInterest(
  balance: Decimal,
  annualRatePercent: Decimal,
): Decimal {
  // COBOL: COMPUTE WS-INT-CHARGE = WS-ACCT-BAL * (WS-DIS-INT-RATE / 100) / 12
  return balance.times(annualRatePercent.dividedBy(100)).dividedBy(12);
}

/**
 * Format a Decimal as a currency string with 2 decimal places.
 * Matches COBOL PIC +ZZZ,ZZZ,ZZZ.ZZ display format.
 */
export function formatCurrency(value: Decimal): string {
  const abs = value.abs();
  const sign = value.isNegative() ? '-' : '+';
  const [intPart, decPart = '00'] = abs.toFixed(2).split('.');
  const formatted = Number(intPart).toLocaleString('en-US');
  return `${sign}${formatted}.${decPart}`;
}

/**
 * Convert a Decimal to a string suitable for database storage.
 * TypeORM 'decimal' columns expect string values for precision safety.
 */
export function decimalToString(value: Decimal, scale = 2): string {
  return value.toFixed(scale);
}

export { Decimal };
