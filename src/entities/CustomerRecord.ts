/**
 * Generated from CUSTREC.cpy / CVCUS01Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Data-structure for Customer entity (RECLN 500)
 *   Defines the customer master record stored in CUSTFILE VSAM KSDS.
 *   Key: CUST-ID (9-digit numeric). Used by CBCUS01C, CBTRN01C, CBTRN02C.
 *   Note: Two copybooks (CUSTREC and CVCUS01Y) define identical structures;
 *   CUSTREC is older with tab-indented source; CVCUS01Y is canonical.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface ICustomerRecord {
  customerId: number;         // PIC 9(09)
  firstName: string;          // PIC X(25)
  middleName: string;         // PIC X(25)
  lastName: string;           // PIC X(25)
  addressLine1: string;       // PIC X(50)
  addressLine2: string;       // PIC X(50)
  addressLine3: string;       // PIC X(50)
  addressStateCode: string;   // PIC X(02)
  addressCountryCode: string; // PIC X(03)
  addressZip: string;         // PIC X(10)
  phoneNumber1: string;       // PIC X(15)
  phoneNumber2: string;       // PIC X(15)
  ssn: number;                // PIC 9(09)
  govtIssuedId: string;       // PIC X(20)
  dateOfBirth: string;        // PIC X(10) — YYYY-MM-DD
  eftAccountId: string;       // PIC X(10)
  primaryCardHolderIndicator: string; // PIC X(01) — 'Y'/'N'
  ficoCreditScore: number;    // PIC 9(03)
}

// ── TypeORM entity ──

@Entity({ name: 'customer' })
export class CustomerRecord implements ICustomerRecord {

  @PrimaryColumn({ type: 'int', name: 'customer_id' })
  // PIC 9(09)
  customerId!: number;

  @Column({ type: 'varchar', length: 25, name: 'first_name' })
  // PIC X(25)
  firstName!: string;

  @Column({ type: 'varchar', length: 25, name: 'middle_name', default: '' })
  // PIC X(25)
  middleName!: string;

  @Column({ type: 'varchar', length: 25, name: 'last_name' })
  // PIC X(25)
  lastName!: string;

  @Column({ type: 'varchar', length: 50, name: 'address_line_1', default: '' })
  // PIC X(50)
  addressLine1!: string;

  @Column({ type: 'varchar', length: 50, name: 'address_line_2', default: '' })
  // PIC X(50)
  addressLine2!: string;

  @Column({ type: 'varchar', length: 50, name: 'address_line_3', default: '' })
  // PIC X(50)
  addressLine3!: string;

  @Column({ type: 'char', length: 2, name: 'address_state_code', default: '' })
  // PIC X(02)
  addressStateCode!: string;

  @Column({ type: 'char', length: 3, name: 'address_country_code', default: 'USA' })
  // PIC X(03)
  addressCountryCode!: string;

  @Column({ type: 'varchar', length: 10, name: 'address_zip', default: '' })
  // PIC X(10)
  addressZip!: string;

  @Column({ type: 'varchar', length: 15, name: 'phone_number_1', default: '' })
  // PIC X(15)
  phoneNumber1!: string;

  @Column({ type: 'varchar', length: 15, name: 'phone_number_2', default: '' })
  // PIC X(15)
  phoneNumber2!: string;

  @Column({ type: 'int', name: 'ssn', default: 0 })
  // PIC 9(09)
  ssn!: number;

  @Column({ type: 'varchar', length: 20, name: 'govt_issued_id', default: '' })
  // PIC X(20)
  govtIssuedId!: string;

  @Column({ type: 'varchar', length: 10, name: 'date_of_birth', default: '' })
  // PIC X(10) — YYYY-MM-DD format
  dateOfBirth!: string;

  @Column({ type: 'varchar', length: 10, name: 'eft_account_id', default: '' })
  // PIC X(10)
  eftAccountId!: string;

  @Column({ type: 'char', length: 1, name: 'primary_card_holder_indicator', default: 'Y' })
  // PIC X(01)
  primaryCardHolderIndicator!: string;

  @Column({ type: 'smallint', name: 'fico_credit_score', default: 0 })
  // PIC 9(03)
  ficoCreditScore!: number;
}
