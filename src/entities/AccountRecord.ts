/**
 * Generated from CVACT01Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for account entity (RECLN 300)
 *   Defines the account master record stored in ACCTFILE VSAM KSDS.
 *   Key: ACCT-ID (11-digit numeric). Used across nearly every program:
 *   CBACT04C (interest), CBTRN02C (transaction posting), COBIL00C (bill payment),
 *   COACTUPC (account update), COACTVWC (account view).
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COMP-3 note: ACCT-CURR-BAL, ACCT-CREDIT-LIMIT, ACCT-CASH-CREDIT-LIMIT,
 * ACCT-CURR-CYC-CREDIT, ACCT-CURR-CYC-DEBIT are all S9(10)V99 — signed
 * 10-digit integers with 2 decimal places. Use Decimal.js for all arithmetic.
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface IAccountRecord {
  accountId: string;            // PIC 9(11)
  activeStatus: string;         // PIC X(01)
  currentBalance: string;       // PIC S9(10)V99 — COMP-3, use Decimal.js
  creditLimit: string;          // PIC S9(10)V99 — COMP-3, use Decimal.js
  cashCreditLimit: string;      // PIC S9(10)V99 — COMP-3, use Decimal.js
  openDate: string;             // PIC X(10) — YYYY-MM-DD
  expirationDate: string;       // PIC X(10) — YYYY-MM-DD
  reissueDate: string;          // PIC X(10) — YYYY-MM-DD
  currentCycleCredit: string;   // PIC S9(10)V99 — COMP-3, use Decimal.js
  currentCycleDebit: string;    // PIC S9(10)V99 — COMP-3, use Decimal.js
  addressZip: string;           // PIC X(10)
  groupId: string;              // PIC X(10) — used to look up disclosure/interest group
}

// ── TypeORM entity ──

@Entity({ name: 'account' })
export class AccountRecord implements IAccountRecord {

  @PrimaryColumn({ type: 'varchar', length: 11, name: 'account_id' })
  // PIC 9(11)
  accountId!: string;

  @Column({ type: 'char', length: 1, name: 'active_status', default: 'Y' })
  // PIC X(01)
  activeStatus!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_balance', default: 0 })
  // PIC S9(10)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  currentBalance!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'credit_limit', default: 0 })
  // PIC S9(10)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  creditLimit!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'cash_credit_limit', default: 0 })
  // PIC S9(10)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  cashCreditLimit!: string;

  @Column({ type: 'varchar', length: 10, name: 'open_date', default: '' })
  // PIC X(10) — YYYY-MM-DD
  openDate!: string;

  @Column({ type: 'varchar', length: 10, name: 'expiration_date', default: '' })
  // PIC X(10) — YYYY-MM-DD
  expirationDate!: string;

  @Column({ type: 'varchar', length: 10, name: 'reissue_date', default: '' })
  // PIC X(10) — YYYY-MM-DD
  reissueDate!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_cycle_credit', default: 0 })
  // PIC S9(10)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  currentCycleCredit!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_cycle_debit', default: 0 })
  // PIC S9(10)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  currentCycleDebit!: string;

  @Column({ type: 'varchar', length: 10, name: 'address_zip', default: '' })
  // PIC X(10)
  addressZip!: string;

  @Column({ type: 'varchar', length: 10, name: 'group_id', default: '' })
  // PIC X(10) — maps to DIS-ACCT-GROUP-ID in DisclosureGroup for interest rate lookup
  groupId!: string;
}
