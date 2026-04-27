/**
 * Generated from CVACT02Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for card entity (RECLN 150)
 *   Defines the credit card master record stored in CARDFILE VSAM KSDS.
 *   Key: CARD-NUM (16-char card number). Used by CBACT02C, CBTRN01C, CBTRN02C,
 *   COCRDUPC, COCRDSLC, COCRDLIC, COBIL00C.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface (for non-database use: DTOs, batch working-storage, etc.) ──

export interface ICardRecord {
  cardNumber: string;        // PIC X(16) — primary key
  accountId: string;         // PIC 9(11)
  cvvCode: number;           // PIC 9(03)
  embossedName: string;      // PIC X(50)
  expirationDate: string;    // PIC X(10) — stored as YYYY-MM-DD
  activeStatus: string;      // PIC X(01) — 'Y' = active, 'N' = inactive
}

// ── TypeORM entity ──

@Entity({ name: 'card' })
export class CardRecord implements ICardRecord {

  @PrimaryColumn({ type: 'varchar', length: 16, name: 'card_number' })
  // PIC X(16)
  cardNumber!: string;

  @Column({ type: 'varchar', length: 11, name: 'account_id' })
  // PIC 9(11)
  accountId!: string;

  @Column({ type: 'int', name: 'cvv_code' })
  // PIC 9(03)
  cvvCode!: number;

  @Column({ type: 'varchar', length: 50, name: 'embossed_name' })
  // PIC X(50)
  embossedName!: string;

  @Column({ type: 'varchar', length: 10, name: 'expiration_date' })
  // PIC X(10)
  expirationDate!: string;

  @Column({ type: 'char', length: 1, name: 'active_status', default: 'Y' })
  // PIC X(01)
  activeStatus!: string;
}
