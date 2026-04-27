/**
 * Generated from CVTRA01Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for transaction category balance (RECLN 50)
 *   The TCATBAL VSAM KSDS tracks per-account, per-transaction-type, per-category
 *   running balances. This is the input to CBACT04C (interest calculator), which reads
 *   each category balance and computes the interest charge using the DisclosureGroup
 *   interest rate for that account group + type + category combination.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface ITransactionCategoryBalance {
  accountId: string;      // PIC 9(11) — composite key part 1
  typeCode: string;       // PIC X(02) — composite key part 2
  categoryCode: number;   // PIC 9(04) — composite key part 3
  balance: string;        // PIC S9(09)V99 — use Decimal.js
}

// ── TypeORM entity ──

@Entity({ name: 'transaction_category_balance' })
export class TransactionCategoryBalance implements ITransactionCategoryBalance {

  @PrimaryColumn({ type: 'varchar', length: 11, name: 'account_id' })
  // PIC 9(11) — TRANCAT-ACCT-ID, part of composite KSDS key
  accountId!: string;

  @PrimaryColumn({ type: 'char', length: 2, name: 'type_code' })
  // PIC X(02) — TRANCAT-TYPE-CD, part of composite KSDS key
  typeCode!: string;

  @PrimaryColumn({ type: 'int', name: 'category_code' })
  // PIC 9(04) — TRANCAT-CD, part of composite KSDS key
  categoryCode!: number;

  @Column({ type: 'decimal', precision: 11, scale: 2, name: 'balance', default: 0 })
  // PIC S9(09)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  // CBACT04C reads this and computes: interest = balance * (rate / 100) / 12
  balance!: string;
}
