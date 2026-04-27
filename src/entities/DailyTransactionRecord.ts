/**
 * Generated from CVTRA06Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for DALYTRANsaction record (RECLN 350)
 *   Defines the daily transaction staging record (DALYTRAN sequential file).
 *   This is the INPUT to the batch posting pipeline: transactions accumulate here
 *   during the day, then CBTRN01C validates them and CBTRN02C posts them to
 *   the permanent TRANSACT file, updating account balances.
 *   DALYTRAN has the same layout as TRAN-RECORD; it exists as a staging area.
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * In a PostgreSQL migration, this becomes a staging table that is truncated after
 * each batch posting run. Consider adding a `batch_date` column for auditability.
 */

import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

// ── Plain interface ──

export interface IDailyTransactionRecord {
  transactionId: string;    // PIC X(16)
  typeCode: string;         // PIC X(02)
  categoryCode: number;     // PIC 9(04)
  source: string;           // PIC X(10)
  description: string;      // PIC X(100)
  amount: string;           // PIC S9(09)V99 — use Decimal.js
  merchantId: number;       // PIC 9(09)
  merchantName: string;     // PIC X(50)
  merchantCity: string;     // PIC X(50)
  merchantZip: string;      // PIC X(10)
  cardNumber: string;       // PIC X(16)
  originTimestamp: string;  // PIC X(26)
  processTimestamp: string; // PIC X(26)
}

// ── TypeORM entity ──

@Entity({ name: 'daily_transaction_staging' })
export class DailyTransactionRecord implements IDailyTransactionRecord {

  @PrimaryColumn({ type: 'varchar', length: 16, name: 'transaction_id' })
  // PIC X(16)
  transactionId!: string;

  @Column({ type: 'char', length: 2, name: 'type_code' })
  // PIC X(02)
  typeCode!: string;

  @Column({ type: 'int', name: 'category_code' })
  // PIC 9(04)
  categoryCode!: number;

  @Column({ type: 'varchar', length: 10, name: 'source', default: '' })
  // PIC X(10)
  source!: string;

  @Column({ type: 'varchar', length: 100, name: 'description', default: '' })
  // PIC X(100)
  description!: string;

  @Column({ type: 'decimal', precision: 11, scale: 2, name: 'amount' })
  // PIC S9(09)V99 — COMP-3: use Decimal.js for arithmetic, not native number
  amount!: string;

  @Column({ type: 'int', name: 'merchant_id', default: 0 })
  // PIC 9(09)
  merchantId!: number;

  @Column({ type: 'varchar', length: 50, name: 'merchant_name', default: '' })
  // PIC X(50)
  merchantName!: string;

  @Column({ type: 'varchar', length: 50, name: 'merchant_city', default: '' })
  // PIC X(50)
  merchantCity!: string;

  @Column({ type: 'varchar', length: 10, name: 'merchant_zip', default: '' })
  // PIC X(10)
  merchantZip!: string;

  @Index('idx_daily_tran_card')
  @Column({ type: 'varchar', length: 16, name: 'card_number' })
  // PIC X(16)
  cardNumber!: string;

  @Column({ type: 'varchar', length: 26, name: 'origin_timestamp', default: '' })
  // PIC X(26)
  originTimestamp!: string;

  @Column({ type: 'varchar', length: 26, name: 'process_timestamp', default: '' })
  // PIC X(26)
  processTimestamp!: string;
}
