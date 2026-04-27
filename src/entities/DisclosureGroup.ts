/**
 * Generated from CVTRA02Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for disclosure group (RECLN 50)
 *   The DISCGRP VSAM KSDS stores interest rates keyed by account group + transaction
 *   type + category code. CBACT04C uses this to look up the annual interest rate for
 *   each category of spending on each account.
 *   DIS-INT-RATE is S9(04)V99 — a signed 4-digit integer with 2 decimal places.
 *   E.g., value 1599 means 15.99% annual rate.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface IDisclosureGroup {
  accountGroupId: string;  // PIC X(10) — maps to AccountRecord.groupId
  typeCode: string;        // PIC X(02)
  categoryCode: number;    // PIC 9(04)
  interestRate: string;    // PIC S9(04)V99 — annual rate, e.g. '15.99'
}

// ── TypeORM entity ──

@Entity({ name: 'disclosure_group' })
export class DisclosureGroup implements IDisclosureGroup {

  @PrimaryColumn({ type: 'varchar', length: 10, name: 'account_group_id' })
  // PIC X(10) — DIS-ACCT-GROUP-ID; join key to ACCOUNT-RECORD.ACCT-GROUP-ID
  accountGroupId!: string;

  @PrimaryColumn({ type: 'char', length: 2, name: 'type_code' })
  // PIC X(02) — DIS-TRAN-TYPE-CD
  typeCode!: string;

  @PrimaryColumn({ type: 'int', name: 'category_code' })
  // PIC 9(04) — DIS-TRAN-CAT-CD
  categoryCode!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'interest_rate' })
  // PIC S9(04)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  // This is an annual percentage rate. Divide by 12 to get monthly rate.
  interestRate!: string;
}
