/**
 * Generated from CSUSR01Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: Security user data structure
 *   Defines the user security record stored in USRSEC VSAM.
 *   Key: SEC-USR-ID (8-char). Used by COSGN00C (sign-on validation), COUSR00C–03C
 *   (user management CRUD), and checked in every CICS program for authorization.
 *
 * SECURITY NOTE: In COBOL, passwords are stored as plaintext PIC X(08) in the USRSEC
 * VSAM file. The migration MUST replace this with a proper password hashing scheme
 * (e.g., bcrypt). The `passwordHash` column below stores the hashed value;
 * the raw password should never be persisted.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';

// ── Plain interface ──

export interface IUserSecurityRecord {
  userId: string;      // PIC X(08)
  firstName: string;   // PIC X(20)
  lastName: string;    // PIC X(20)
  /** @deprecated Raw password field from COBOL — never store plaintext. Use passwordHash. */
  password?: string;   // PIC X(08) — COBOL plaintext; replaced by passwordHash
  passwordHash: string; // bcrypt hash — replaces SEC-USR-PWD
  userType: string;    // PIC X(01) — 'A' = admin, 'U' = regular user
}

// ── TypeORM entity ──

@Entity({ name: 'user_security' })
export class UserSecurityRecord implements IUserSecurityRecord {

  @PrimaryColumn({ type: 'varchar', length: 8, name: 'user_id' })
  // PIC X(08) — SEC-USR-ID
  userId!: string;

  @Column({ type: 'varchar', length: 20, name: 'first_name', default: '' })
  // PIC X(20) — SEC-USR-FNAME
  firstName!: string;

  @Column({ type: 'varchar', length: 20, name: 'last_name', default: '' })
  // PIC X(20) — SEC-USR-LNAME
  lastName!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  // Replaces PIC X(08) SEC-USR-PWD — store bcrypt hash, never plaintext
  // Use bcrypt.hash(password, 12) on write; bcrypt.compare on sign-on.
  passwordHash!: string;

  @Column({ type: 'char', length: 1, name: 'user_type', default: 'U' })
  // PIC X(01) — SEC-USR-TYPE: 'A' = admin (CDEMO-USRTYP-ADMIN), 'U' = user (CDEMO-USRTYP-USER)
  // Admin users see COADM01C menu; regular users see COMEN01C menu.
  userType!: string;
}
