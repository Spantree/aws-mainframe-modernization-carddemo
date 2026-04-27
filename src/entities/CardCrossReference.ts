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
  accountId: number;    // PIC 9(11)
}

// ── TypeORM entity ──

@Entity({ name: 'card_cross_reference' })
export class CardCrossReference implements ICardCrossReference {

  @PrimaryColumn({ type: 'varchar', length: 16, name: 'card_number' })
  // PIC X(16) — primary KSDS key
  cardNumber: string;

  @Column({ type: 'int', name: 'customer_id' })
  // PIC 9(09)
  customerId: number;

  @Index('idx_card_xref_account_id')
  @Column({ type: 'bigint', name: 'account_id' })
  // PIC 9(11)
  // Note: In the COBOL VSAM file, FD-XREF-ACCT-ID was declared as an ALTERNATE RECORD KEY
  // allowing random access by account ID (used in CBACT04C for interest calculation).
  // The index above replicates that alternate-key access path.
  accountId: number;
}
