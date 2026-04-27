/**
 * Generated from CVTRA03Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for transaction type (RECLN 60)
 *   Reference table mapping 2-char transaction type codes to descriptions.
 *   Examples: 'PR' → 'Purchase', 'CR' → 'Credit', 'FE' → 'Fee', etc.
 *   Used in CBTRN01C/CBTRN03C reporting and COTRN01C/COTRN02C display.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface ITransactionType {
  typeCode: string;        // PIC X(02)
  typeDescription: string; // PIC X(50)
}

// ── TypeORM entity ──

@Entity({ name: 'transaction_type' })
export class TransactionType implements ITransactionType {

  @PrimaryColumn({ type: 'char', length: 2, name: 'type_code' })
  // PIC X(02)
  typeCode!: string;

  @Column({ type: 'varchar', length: 50, name: 'type_description' })
  // PIC X(50)
  typeDescription!: string;
}
