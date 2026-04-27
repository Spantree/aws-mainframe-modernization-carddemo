/**
 * Generated from CVTRA05Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for TRANsaction record (RECLN 350)
 *   Defines the permanent transaction record stored in TRANSACT VSAM KSDS.
 *   Key: TRAN-ID (16-char). Written by CBTRN02C (batch posting) and COBIL00C
 *   (online bill payment). Read by CBTRN01C, CBTRN03C (reporting), COTRN01C, COTRN02C.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

// ── Plain interface ──

export interface ITransactionRecord {
  transactionId: string;     // PIC X(16)
  typeCode: string;          // PIC X(02) — e.g. 'PR' purchase, 'CR' credit
  categoryCode: number;      // PIC 9(04)
  source: string;            // PIC X(10)
  description: string;       // PIC X(100)
  amount: string;            // PIC S9(09)V99 — use Decimal.js
  merchantId: number;        // PIC 9(09)
  merchantName: string;      // PIC X(50)
  merchantCity: string;      // PIC X(50)
  merchantZip: string;       // PIC X(10)
  cardNumber: string;        // PIC X(16) — FK to CardRecord
  originTimestamp: string;   // PIC X(26) — YYYY-MM-DD HH:MM:SS.MMMMMM
  processTimestamp: string;  // PIC X(26) — YYYY-MM-DD HH:MM:SS.MMMMMM
}

// ── TypeORM entity ──

@Entity({ name: 'transaction' })
export class TransactionRecord implements ITransactionRecord {

  @PrimaryColumn({ type: 'varchar', length: 16, name: 'transaction_id' })
  // PIC X(16)
  transactionId: string;

  @Index('idx_transaction_type')
  @Column({ type: 'char', length: 2, name: 'type_code' })
  // PIC X(02) — transaction type code; see TransactionType entity for descriptions
  typeCode: string;

  @Column({ type: 'int', name: 'category_code' })
  // PIC 9(04) — transaction category code; see TransactionCategory entity
  categoryCode: number;

  @Column({ type: 'varchar', length: 10, name: 'source', default: '' })
  // PIC X(10)
  source: string;

  @Column({ type: 'varchar', length: 100, name: 'description', default: '' })
  // PIC X(100)
  description: string;

  @Column({ type: 'decimal', precision: 11, scale: 2, name: 'amount' })
  // PIC S9(09)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  amount: string;

  @Column({ type: 'int', name: 'merchant_id', default: 0 })
  // PIC 9(09)
  merchantId: number;

  @Column({ type: 'varchar', length: 50, name: 'merchant_name', default: '' })
  // PIC X(50)
  merchantName: string;

  @Column({ type: 'varchar', length: 50, name: 'merchant_city', default: '' })
  // PIC X(50)
  merchantCity: string;

  @Column({ type: 'varchar', length: 10, name: 'merchant_zip', default: '' })
  // PIC X(10)
  merchantZip: string;

  @Index('idx_transaction_card')
  @Column({ type: 'varchar', length: 16, name: 'card_number' })
  // PIC X(16) — join to card_cross_reference to find account
  cardNumber: string;

  @Column({ type: 'varchar', length: 26, name: 'origin_timestamp', default: '' })
  // PIC X(26) — when the transaction originated
  originTimestamp: string;

  @Column({ type: 'varchar', length: 26, name: 'process_timestamp', default: '' })
  // PIC X(26) — when the transaction was posted by CBTRN02C
  processTimestamp: string;
}
