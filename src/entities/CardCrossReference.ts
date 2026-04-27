/**
 * Generated from CVACT03Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for card cross-reference (RECLN 50)
 *   The CARDXREF VSAM KSDS provides the mapping from card number → customer ID → account ID.
 *   This is the key join table for the CardDemo data model. All transaction lookups
 *   start here: given a card number, find the account.
 *   Used by: CBACT03C, CBACT04C, CBTRN01C, CBTRN02C, COCRDUPC, COCRDLIC, COCRDSLC.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

// ── Plain interface ──

export interface ICardCrossReference {
  cardNumber: string;   // PIC X(16) — primary key
  customerId: number;   // PIC 9(09)
  /**
   * PIC 9(11). Stored as a string to match `AccountRecord.accountId` and
   * because TypeORM `bigint` columns return JS strings (a `number` here would
   * lie about the runtime shape).
   */
  accountId: string;
}

// ── TypeORM entity ──

@Entity({ name: 'card_cross_reference' })
export class CardCrossReference implements ICardCrossReference {

  @PrimaryColumn({ type: 'varchar', length: 16, name: 'card_number' })
  // PIC X(16) — primary KSDS key
  cardNumber!: string;

  @Column({ type: 'int', name: 'customer_id' })
  // PIC 9(09)
  customerId!: number;

  @Index('idx_card_xref_account_id')
  @Column({ type: 'bigint', name: 'account_id' })
  // PIC 9(11). FD-XREF-ACCT-ID was an ALTERNATE RECORD KEY in the COBOL VSAM
  // file (used by CBACT04C); the index above keeps that access path. TypeORM
  // returns `bigint` columns as strings, which also matches AccountRecord.
  accountId!: string;
}
