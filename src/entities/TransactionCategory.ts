/**
 * Generated from CVTRA04Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for transaction category type (RECLN 60)
 *   Reference table mapping (type code + category code) composite key to a description.
 *   The composite key is (TRAN-TYPE-CD X(02) + TRAN-CAT-CD 9(04)).
 *   Used in CBTRN01C/CBTRN03C for report line formatting: category descriptions
 *   appear alongside amounts in the daily transaction report.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface ITransactionCategory {
  typeCode: string;         // PIC X(02) — part of composite key
  categoryCode: number;     // PIC 9(04) — part of composite key
  categoryDescription: string; // PIC X(50)
}

// ── TypeORM entity ──

@Entity({ name: 'transaction_category' })
export class TransactionCategory implements ITransactionCategory {

  @PrimaryColumn({ type: 'char', length: 2, name: 'type_code' })
  // PIC X(02) — TRAN-TYPE-CD
  typeCode: string;

  @PrimaryColumn({ type: 'int', name: 'category_code' })
  // PIC 9(04) — TRAN-CAT-CD
  categoryCode: number;

  @Column({ type: 'varchar', length: 50, name: 'category_description' })
  // PIC X(50) — TRAN-CAT-TYPE-DESC
  categoryDescription: string;
}
