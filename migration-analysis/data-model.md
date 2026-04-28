# CardDemo Data Model

**Generated:** 2026-02-28
**Source:** `app/cpy/` (29 copybooks), `app/cpy-bms/` (17 BMS screen maps)
**Target:** TypeScript / NestJS / TypeORM + PostgreSQL

---

## Contents

1. [Overview](#overview)
2. [Entity Relationship Summary](#entity-relationship-summary)
3. [Core Entity Copybooks](#core-entity-copybooks)
   - [CVACT01Y — ACCOUNT-RECORD](#cvact01y--account-record)
   - [CVACT02Y — CARD-RECORD](#cvact02y--card-record)
   - [CVACT03Y — CARD-XREF-RECORD](#cvact03y--card-xref-record)
   - [CVCUS01Y — CUSTOMER-RECORD](#cvcus01y--customer-record)
   - [CVTRA05Y — TRAN-RECORD](#cvtra05y--tran-record)
   - [CVTRA06Y — DALYTRAN-RECORD](#cvtra06y--dalytran-record)
   - [CSUSR01Y — SEC-USER-DATA](#csusr01y--sec-user-data)
4. [Lookup Copybooks](#lookup-copybooks)
   - [CVTRA03Y — TRAN-TYPE-RECORD](#cvtra03y--tran-type-record)
   - [CVTRA04Y — TRAN-CAT-RECORD](#cvtra04y--tran-cat-record)
   - [CVTRA01Y — TRAN-CAT-BAL-RECORD](#cvtra01y--tran-cat-bal-record)
   - [CVTRA02Y — DIS-GROUP-RECORD](#cvtra02y--dis-group-record)
5. [Export/Integration Copybooks](#exportintegration-copybooks)
   - [CVEXPORT — EXPORT-RECORD (REDEFINES)](#cvexport--export-record-redefines)
6. [CICS / Working Storage Copybooks](#cics--working-storage-copybooks)
7. [BMS Screen Maps](#bms-screen-maps)
8. [Dead Code](#dead-code)
9. [COBOL Type Mapping Reference](#cobol-type-mapping-reference)
10. [Data Migration Notes](#data-migration-notes)
11. [Security Findings](#security-findings)
12. [Validation Checklist](#validation-checklist)

---

## Overview

CardDemo is a COBOL/CICS credit card management system. The persistent data model
comprises 12 VSAM/KSDS files mapped to 12 COBOL copybooks. The core domain entities
are: **Customer**, **Account**, **Card**, **CardXref** (card-to-customer-account
linkage), **Transaction**, and **User** (security).

All numeric financial fields use COBOL's implied decimal notation (`V` in PIC clause)
and must map to a `Decimal` (Decimal.js) value in TypeScript and PostgreSQL
`NUMERIC(p,s)`. **Never use `number` (JavaScript double) for these fields** — silent
rounding will corrupt financial totals across millions of transactions.

All `PIC X` character fields are stored in EBCDIC on the mainframe. Data migration
must convert to UTF-8 (IBM code page CP037 assumed for US). EBCDIC and UTF-8 have
different sort orders — any ORDER BY or comparison logic on character fields requires
review.

---

## Entity Relationship Summary

```
customer_record (1) ─────────────────── (M) card_xref_record
account_record  (1) ─────────────────── (M) card_xref_record
card_record     (1) ─────────────────── (1) card_xref_record

account_record  (1) ─────────────────── (M) card_record
account_record  (1) ─────────────────── (M) tran_cat_bal_record
account_record  (1) ─────────────────── (*) [via card] tran_record

card_record     (1) ─────────────────── (M) tran_record
card_record     (1) ─────────────────── (M) dalytran_record

tran_type_record (1) ────────────────── (M) tran_cat_record
tran_type_record (1) ────────────────── (M) tran_cat_bal_record
tran_type_record (1) ────────────────── (M) dis_group_record
tran_type_record (1) ────────────────── (M) tran_record

dis_group_record (referenced by) account_record.acct_group_id
sec_user_data (standalone — application authentication)
```

---

## Core Entity Copybooks

### CVACT01Y — ACCOUNT-RECORD

**File:** `app/cpy/CVACT01Y.cpy`
**Record length:** 300 bytes
**TypeORM entity:** `AccountRecord`
**PostgreSQL table:** `account_record`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| ACCT-ID | `PIC 9(11)` | `number` | `BIGINT NOT NULL PK` | 11-digit account ID |
| ACCT-ACTIVE-STATUS | `PIC X(01)` | `string` | `CHAR(1)` | Active flag |
| ACCT-CURR-BAL | `PIC S9(10)V99` | `Decimal` | `NUMERIC(12,2)` | **NEVER float/double** |
| ACCT-CREDIT-LIMIT | `PIC S9(10)V99` | `Decimal` | `NUMERIC(12,2)` | |
| ACCT-CASH-CREDIT-LIMIT | `PIC S9(10)V99` | `Decimal` | `NUMERIC(12,2)` | |
| ACCT-OPEN-DATE | `PIC X(10)` | `Date` | `DATE` | Format YYYY-MM-DD |
| ACCT-EXPIRAION-DATE | `PIC X(10)` | `Date` | `DATE` | Typo in COBOL (missing T) |
| ACCT-REISSUE-DATE | `PIC X(10)` | `Date` | `DATE` | Format YYYY-MM-DD |
| ACCT-CURR-CYC-CREDIT | `PIC S9(10)V99` | `Decimal` | `NUMERIC(12,2)` | |
| ACCT-CURR-CYC-DEBIT | `PIC S9(10)V99` | `Decimal` | `NUMERIC(12,2)` | |
| ACCT-ADDR-ZIP | `PIC X(10)` | `string` | `VARCHAR(10)` | |
| ACCT-GROUP-ID | `PIC X(10)` | `string` | `VARCHAR(10)` | FK → `dis_group_record` |
| FILLER | `PIC X(178)` | — | — | Padding; not migrated |

**TypeORM entity skeleton:**
```typescript
@Entity('account_record')
export class AccountRecord {
  @PrimaryColumn({ type: 'bigint' })
  acctId: string;

  @Column({ type: 'char', length: 1 })
  acctActiveStatus: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  acctCurrBal: Decimal;            // NEVER float/double

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  acctCreditLimit: Decimal;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  acctCashCreditLimit: Decimal;

  @Column({ type: 'date' })
  acctOpenDate: Date;

  @Column({ type: 'date' })
  acctExpirationDate: Date;        // note: COBOL typo corrected

  @Column({ type: 'date' })
  acctReissueDate: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  acctCurrCycCredit: Decimal;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  acctCurrCycDebit: Decimal;

  @Column({ type: 'varchar', length: 10 })
  acctAddrZip: string;

  @Column({ type: 'varchar', length: 10 })
  acctGroupId: string;
}
```

---

### CVACT02Y — CARD-RECORD

**File:** `app/cpy/CVACT02Y.cpy`
**Record length:** 150 bytes
**TypeORM entity:** `CardRecord`
**PostgreSQL table:** `card_record`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| CARD-NUM | `PIC X(16)` | `string` | `VARCHAR(16) NOT NULL PK` | Store as string — leading zeros matter |
| CARD-ACCT-ID | `PIC 9(11)` | `number` | `BIGINT NOT NULL FK` | FK → `account_record` |
| CARD-CVV-CD | `PIC 9(03)` | `number` | `SMALLINT` | **PCI DSS: must not persist post-auth** |
| CARD-EMBOSSED-NAME | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| CARD-EXPIRAION-DATE | `PIC X(10)` | `Date` | `DATE` | Typo in COBOL |
| CARD-ACTIVE-STATUS | `PIC X(01)` | `string` | `CHAR(1)` | |
| FILLER | `PIC X(59)` | — | — | |

**Security note:** CVV (`CARD-CVV-CD`) must not be stored after authorization per
PCI DSS requirement 3.3. Migration must exclude or immediately delete this value.

---

### CVACT03Y — CARD-XREF-RECORD

**File:** `app/cpy/CVACT03Y.cpy`
**Record length:** 50 bytes
**TypeORM entity:** `CardXrefRecord`
**PostgreSQL table:** `card_xref_record`

This is the linking table connecting Card → Customer and Card → Account. The
primary key is the card number.

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| XREF-CARD-NUM | `PIC X(16)` | `string` | `VARCHAR(16) NOT NULL PK, FK` | FK → `card_record` |
| XREF-CUST-ID | `PIC 9(09)` | `number` | `INTEGER NOT NULL FK` | FK → `customer_record` |
| XREF-ACCT-ID | `PIC 9(11)` | `number` | `BIGINT NOT NULL FK` | FK → `account_record` |
| FILLER | `PIC X(14)` | — | — | |

---

### CVCUS01Y — CUSTOMER-RECORD

**File:** `app/cpy/CVCUS01Y.cpy`
**Record length:** 500 bytes
**TypeORM entity:** `CustomerRecord`
**PostgreSQL table:** `customer_record`

**PII fields:** SSN, date of birth, government-issued ID, phone numbers, address.
All must be treated as sensitive; consider encryption at rest or column-level
tokenization.

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| CUST-ID | `PIC 9(09)` | `number` | `INTEGER NOT NULL PK` | |
| CUST-FIRST-NAME | `PIC X(25)` | `string` | `VARCHAR(25)` | |
| CUST-MIDDLE-NAME | `PIC X(25)` | `string` | `VARCHAR(25)` | |
| CUST-LAST-NAME | `PIC X(25)` | `string` | `VARCHAR(25)` | |
| CUST-ADDR-LINE-1 | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| CUST-ADDR-LINE-2 | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| CUST-ADDR-LINE-3 | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| CUST-ADDR-STATE-CD | `PIC X(02)` | `string` | `CHAR(2)` | 2-char US state code |
| CUST-ADDR-COUNTRY-CD | `PIC X(03)` | `string` | `CHAR(3)` | ISO 3166-1 alpha-3 |
| CUST-ADDR-ZIP | `PIC X(10)` | `string` | `VARCHAR(10)` | |
| CUST-PHONE-NUM-1 | `PIC X(15)` | `string` | `VARCHAR(15)` | PII |
| CUST-PHONE-NUM-2 | `PIC X(15)` | `string` | `VARCHAR(15)` | PII |
| CUST-SSN | `PIC 9(09)` | `number` | `INTEGER` | **SENSITIVE PII** — integer; leading zeros lost |
| CUST-GOVT-ISSUED-ID | `PIC X(20)` | `string` | `VARCHAR(20)` | **SENSITIVE PII** |
| CUST-DOB-YYYY-MM-DD | `PIC X(10)` | `Date` | `DATE` | **SENSITIVE PII**; YYYY-MM-DD |
| CUST-EFT-ACCOUNT-ID | `PIC X(10)` | `string` | `VARCHAR(10)` | |
| CUST-PRI-CARD-HOLDER-IND | `PIC X(01)` | `string` | `CHAR(1)` | Primary card holder flag |
| CUST-FICO-CREDIT-SCORE | `PIC 9(03)` | `number` | `SMALLINT` | Range 300–850 |
| FILLER | `PIC X(168)` | — | — | |

**Duplicate copybook:** `CUSTREC.cpy` defines an identical `CUSTOMER-RECORD` with
one field name difference: `CUST-DOB-YYYYMMDD` (no hyphens) vs `CUST-DOB-YYYY-MM-DD`.
Same layout. `CVCUS01Y` is the canonical source; `CUSTREC` appears to be an older
version. Both map to the same table.

---

### CVTRA05Y — TRAN-RECORD

**File:** `app/cpy/CVTRA05Y.cpy`
**Record length:** 350 bytes
**TypeORM entity:** `TranRecord`
**PostgreSQL table:** `tran_record`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| TRAN-ID | `PIC X(16)` | `string` | `VARCHAR(16) NOT NULL PK` | |
| TRAN-TYPE-CD | `PIC X(02)` | `string` | `CHAR(2) FK` | FK → `tran_type_record` |
| TRAN-CAT-CD | `PIC 9(04)` | `number` | `SMALLINT` | |
| TRAN-SOURCE | `PIC X(10)` | `string` | `VARCHAR(10)` | |
| TRAN-DESC | `PIC X(100)` | `string` | `VARCHAR(100)` | |
| TRAN-AMT | `PIC S9(09)V99` | `Decimal` | `NUMERIC(11,2)` | **NEVER float/double** |
| TRAN-MERCHANT-ID | `PIC 9(09)` | `number` | `INTEGER` | |
| TRAN-MERCHANT-NAME | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| TRAN-MERCHANT-CITY | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| TRAN-MERCHANT-ZIP | `PIC X(10)` | `string` | `VARCHAR(10)` | |
| TRAN-CARD-NUM | `PIC X(16)` | `string` | `VARCHAR(16) FK` | FK → `card_record` |
| TRAN-ORIG-TS | `PIC X(26)` | `Date` | `TIMESTAMP` | Format: `YYYY-MM-DD HH:MM:SS.ssssss` |
| TRAN-PROC-TS | `PIC X(26)` | `Date` | `TIMESTAMP` | |
| FILLER | `PIC X(20)` | — | — | |

---

### CVTRA06Y — DALYTRAN-RECORD

**File:** `app/cpy/CVTRA06Y.cpy`
**Record length:** 350 bytes
**TypeORM entity:** `DailyTranRecord`
**PostgreSQL table:** `dalytran_record`

Identical structure to `TRAN-RECORD` (CVTRA05Y) with `DALYTRAN-` prefix. Used in
batch processing programs (`CBTRN02C`, `CBTRN03C`) to stage daily transactions
before posting. See [CVTRA05Y](#cvtra05y--tran-record) for field definitions.

---

### CSUSR01Y — SEC-USER-DATA

**File:** `app/cpy/CSUSR01Y.cpy`
**Record length:** 80 bytes
**TypeORM entity:** `SecUserData`
**PostgreSQL table:** `sec_user_data`

> **CRITICAL SECURITY VULNERABILITY**: `SEC-USR-PWD PIC X(08)` stores passwords in
> **plaintext**. The TypeScript/NestJS migration must hash all passwords with bcrypt (cost ≥12) or
> Argon2id before storing. The PostgreSQL column is expanded to `VARCHAR(72)` for
> BCrypt hash storage. Raw COBOL bytes must never be written to the new column.

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| SEC-USR-ID | `PIC X(08)` | `string` | `VARCHAR(8) NOT NULL PK` | |
| SEC-USR-FNAME | `PIC X(20)` | `string` | `VARCHAR(20)` | |
| SEC-USR-LNAME | `PIC X(20)` | `string` | `VARCHAR(20)` | |
| SEC-USR-PWD | `PIC X(08)` | `string` | `VARCHAR(72)` | **PLAINTEXT IN COBOL — must hash on migration** |
| SEC-USR-TYPE | `PIC X(01)` | `string` | `CHAR(1)` | `'A'`=Admin, `'U'`=User |
| SEC-USR-FILLER | `PIC X(23)` | — | — | Padding |

User type values come from 88-level conditions in `COMEN02Y`:
- `CDEMO-USRTYP-ADMIN VALUE 'A'` → Admin
- `CDEMO-USRTYP-USER VALUE 'U'` → Regular user

---

## Lookup Copybooks

### CVTRA03Y — TRAN-TYPE-RECORD

**File:** `app/cpy/CVTRA03Y.cpy`
**Record length:** 60 bytes
**TypeORM entity:** `TranTypeRecord`
**PostgreSQL table:** `tran_type_record`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| TRAN-TYPE | `PIC X(02)` | `string` | `CHAR(2) NOT NULL PK` | |
| TRAN-TYPE-DESC | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| FILLER | `PIC X(08)` | — | — | |

---

### CVTRA04Y — TRAN-CAT-RECORD

**File:** `app/cpy/CVTRA04Y.cpy`
**Record length:** 60 bytes
**TypeORM entity:** `TranCatRecord`
**PostgreSQL table:** `tran_cat_record`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| TRAN-TYPE-CD | `PIC X(02)` | `string` | `CHAR(2) NOT NULL PK FK` | FK → `tran_type_record` |
| TRAN-CAT-CD | `PIC 9(04)` | `number` | `SMALLINT NOT NULL PK` | |
| TRAN-CAT-TYPE-DESC | `PIC X(50)` | `string` | `VARCHAR(50)` | |
| FILLER | `PIC X(04)` | — | — | |

---

### CVTRA01Y — TRAN-CAT-BAL-RECORD

**File:** `app/cpy/CVTRA01Y.cpy`
**Record length:** 50 bytes
**TypeORM entity:** `TranCatBalRecord`
**PostgreSQL table:** `tran_cat_bal_record`
**Primary key:** composite `(trancat_acct_id, trancat_type_cd, trancat_cd)`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| TRANCAT-ACCT-ID | `PIC 9(11)` | `number` | `BIGINT NOT NULL PK FK` | FK → `account_record` |
| TRANCAT-TYPE-CD | `PIC X(02)` | `string` | `CHAR(2) NOT NULL PK FK` | FK → `tran_type_record` |
| TRANCAT-CD | `PIC 9(04)` | `number` | `SMALLINT NOT NULL PK` | |
| TRAN-CAT-BAL | `PIC S9(09)V99` | `Decimal` | `NUMERIC(11,2)` | **NEVER float/double** |
| FILLER | `PIC X(22)` | — | — | |

---

### CVTRA02Y — DIS-GROUP-RECORD

**File:** `app/cpy/CVTRA02Y.cpy`
**Record length:** 50 bytes
**TypeORM entity:** `DisGroupRecord`
**PostgreSQL table:** `dis_group_record`
**Primary key:** composite `(dis_acct_group_id, dis_tran_type_cd, dis_tran_cat_cd)`

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| DIS-ACCT-GROUP-ID | `PIC X(10)` | `string` | `VARCHAR(10) NOT NULL PK` | Account group classification |
| DIS-TRAN-TYPE-CD | `PIC X(02)` | `string` | `CHAR(2) NOT NULL PK FK` | FK → `tran_type_record` |
| DIS-TRAN-CAT-CD | `PIC 9(04)` | `number` | `SMALLINT NOT NULL PK` | |
| DIS-INT-RATE | `PIC S9(04)V99` | `Decimal` | `NUMERIC(6,2)` | Interest rate % — **NEVER float/double** |
| FILLER | `PIC X(28)` | — | — | |

---

## Export/Integration Copybooks

### CVEXPORT — EXPORT-RECORD (REDEFINES)

**File:** `app/cpy/CVEXPORT.cpy`
**Record length:** 500 bytes
**TypeScript pattern:** Discriminated union `ExportRecordData`
**PostgreSQL table:** `export_record` (JSONB payload)
**Ver:** CardDemo_v2.0 (newer than all other copybooks)

This copybook implements a multi-record-type export file using COBOL `REDEFINES`.
The 460-byte `EXPORT-RECORD-DATA` field is redefined by five different structures
depending on the `EXPORT-REC-TYPE` discriminator.

#### Header Fields (common to all record types)

| COBOL Field | PIC Clause | TypeScript Type | PostgreSQL | Notes |
|---|---|---|---|---|
| EXPORT-REC-TYPE | `PIC X(1)` | `string` | `CHAR(1)` | Discriminator; see variants below |
| EXPORT-TIMESTAMP | `PIC X(26)` | `Date` | `TIMESTAMP` | Also REDEFINES'd into date/time parts |
| EXPORT-SEQUENCE-NUM | `PIC 9(9) COMP` | `number` | `INTEGER` | Binary; TRUNC(STD) max 999999999 |
| EXPORT-BRANCH-ID | `PIC X(4)` | `string` | `VARCHAR(4)` | |
| EXPORT-REGION-CODE | `PIC X(5)` | `string` | `VARCHAR(5)` | |

#### TIMESTAMP REDEFINES

`EXPORT-TIMESTAMP-R REDEFINES EXPORT-TIMESTAMP`:
- `EXPORT-DATE PIC X(10)` — date portion
- `EXPORT-DATE-TIME-SEP PIC X(1)` — separator (usually `T` or space)
- `EXPORT-TIME PIC X(15)` — time portion

#### Record Type Variants

| `EXPORT-REC-TYPE` | REDEFINES Field | TypeScript Type |
|---|---|---|
| `'C'` | `EXPORT-CUSTOMER-DATA` | `CustomerExportData` |
| `'A'` | `EXPORT-ACCOUNT-DATA` | `AccountExportData` |
| `'T'` | `EXPORT-TRANSACTION-DATA` | `TransactionExportData` |
| `'X'` | `EXPORT-CARD-XREF-DATA` | `CardXrefExportData` |
| `'D'` | `EXPORT-CARD-DATA` | `CardExportData` |

**TypeScript discriminated union pattern:**
```typescript
export type ExportRecordData =
  | (CustomerExportData     & { type: 'C' })
  | (AccountExportData      & { type: 'A' })
  | (TransactionExportData  & { type: 'T' })
  | (CardXrefExportData     & { type: 'X' })
  | (CardExportData         & { type: 'D' });

export function fromType(type: string, rawData: Uint8Array): ExportRecordData {
  switch (type) {
    case 'C': return parseCustomer(rawData);
    case 'A': return parseAccount(rawData);
    case 'T': return parseTransaction(rawData);
    case 'X': return parseCardXref(rawData);
    case 'D': return parseCard(rawData);
    default: throw new Error(`Unknown export type: ${type}`);
  }
}
```

#### Notable COMP/COMP-3 fields in export variants

| Field | PIC | Storage | Notes |
|---|---|---|---|
| `EXP-CUST-ID` | `PIC 9(09) COMP` | 4-byte binary | TRUNC(STD) range 0–999999999 |
| `EXP-CUST-FICO-CREDIT-SCORE` | `PIC 9(03) COMP-3` | 2-byte packed | No decimal; maps to `number` |
| `EXP-ACCT-CURR-BAL` | `PIC S9(10)V99 COMP-3` | 7-byte packed | `Decimal`, scale 2 |
| `EXP-ACCT-CASH-CREDIT-LIMIT` | `PIC S9(10)V99 COMP-3` | 7-byte packed | `Decimal`, scale 2 |
| `EXP-ACCT-CURR-CYC-DEBIT` | `PIC S9(10)V99 COMP` | 8-byte binary | Binary with implied decimal — unusual; `Decimal` |
| `EXP-TRAN-AMT` | `PIC S9(09)V99 COMP-3` | 6-byte packed | `Decimal`, scale 2 |
| `EXP-TRAN-MERCHANT-ID` | `PIC 9(09) COMP` | 4-byte binary | `number` |
| `EXP-XREF-ACCT-ID` | `PIC 9(11) COMP` | 8-byte binary | `bigint` (TypeScript) / `BIGINT` (PostgreSQL) |
| `EXP-CARD-ACCT-ID` | `PIC 9(11) COMP` | 8-byte binary | `bigint` (TypeScript) / `BIGINT` (PostgreSQL) |
| `EXP-CARD-CVV-CD` | `PIC 9(03) COMP` | 2-byte binary | `number`; range limited to 999 |

---

## CICS / Working Storage Copybooks

These copybooks do not map to persistent storage. They define CICS communication
structures, working storage, and service interfaces.

| Copybook | Record | Purpose |
|---|---|---|
| `COMEN02Y` | `CARDDEMO-COMMAREA` | CICS COMMAREA passed via `EXEC CICS LINK/XCTL`. Contains navigation state, current user/account/card IDs. Maps to a NestJS request DTO / session context object. Has 88-levels for user type and program context. |
| `CVCRD01Y` | `CC-WORK-AREAS` | CICS session working storage — AID key conditions, current account/card/customer IDs. Has REDEFINES for numeric overlay access. Maps to session context state in the NestJS layer. |
| `CODATECN` | `CODATECN-REC` | Date conversion service I/O. REDEFINES between `YYYYMMDD` and `YYYY-MM-DD` formats. Maps to date-fns formatter helpers. |
| `CSDAT01Y` | `WS-DATE-TIME` | Current date/time working storage with REDEFINES for numeric access (`WS-CURDATE-N`, `WS-CURTIME-N`). Maps to JavaScript `Date` / `Temporal.PlainDate` values. |
| `CSUTLDWY` | Date validation WS | Working storage for date validation routines with extensive REDEFINES and 88-levels for century/month/day validation. |
| `CSUTLDPY` | Date validation paragraphs | Procedure division date edit routines (`EDIT-DATE-CCYYMMDD`, `EDIT-YEAR-CCYY`, etc.). Maps to a TypeScript date validation utility module. |
| `CSMSG01Y` | `CCDA-COMMON-MESSAGES` | Display message string constants. Maps to a TypeScript message enum or i18n message catalog. |
| `CSMSG02Y` | `ABEND-DATA` | Abend diagnostic fields. Maps to a TypeScript exception class with fields for abend code, program, timestamp. |
| `COADM02Y` | `CARDDEMO-ADMIN-MENU-OPTIONS` | Admin menu option constants (6 options). Maps to a TypeScript enum / const map. |
| `COCOM01Y` | `CARDDEMO-MAIN-MENU-OPTIONS` | 11 user menu options via `OCCURS 12`. Maps to a TypeScript enum / const map. Has REDEFINES structure. |
| `COTTL01Y` | `CCDA-SCREEN-TITLE` | Screen title constants. Maps to UI strings. |
| `CSLKPCDY` | `WS-US-PHONE-AREA-CODE-TO-EDIT` | Large phone area code and US state code lookup table with `OCCURS`. Maps to static validation utility or database lookup table. |

---

## BMS Screen Maps

17 CICS BMS screen map copybooks define the terminal screen I/O structures.
Each has paired input (`*I`) and output (`*O`, a REDEFINES of input) map structures.
Fields include: `L`=length (`PIC S9(4) COMP`), `A`=attributes, `I`/`O`=data.

These are **not persistent data** — they define CICS 3270 terminal screen layouts.
In the TypeScript/NestJS modernization, these map to **React UI components** and **GraphQL/REST API DTOs**.

| Copybook | Map Names | Screen Purpose |
|---|---|---|
| `COSGN00.CPY` | `COSGN0AI/COSGN0AO` | Sign-on (userid, password) |
| `COMEN01.CPY` | `COMEN1AI/COMEN1AO` | Main menu (12 option slots) |
| `COADM01.CPY` | `COADM1AI/COADM1AO` | Admin menu (12 option slots) |
| `COACTVW.CPY` | `CACTVWAI/CACTVWAO` | Account view |
| `COACTUP.CPY` | `CACTUPAI/CACTUPAO` | Account update |
| `COBIL00.CPY` | `COBIL0AI/COBIL0AO` | Bill payment |
| `COCRDLI.CPY` | `CCRDLIAI/CCRDLIAO` | Credit card list (7 per page) |
| `COCRDSL.CPY` | `CCRDSLAI/CCRDSLAO` | Credit card select/view |
| `COCRDUP.CPY` | `CCRDUPAI/CCRDUPAO` | Credit card update |
| `CORPT00.CPY` | `CORPT0AI/CORPT0AO` | Report parameters (date range) |
| `COTRN00.CPY` | `COTRN0AI/COTRN0AO` | Transaction list (10 per page) |
| `COTRN01.CPY` | `COTRN1AI/COTRN1AO` | Transaction view (full detail) |
| `COTRN02.CPY` | `COTRN2AI/COTRN2AO` | Transaction add |
| `COUSR00.CPY` | `COUSR0AI/COUSR0AO` | User list (10 per page) |
| `COUSR01.CPY` | `COUSR1AI/COUSR1AO` | User add |
| `COUSR02.CPY` | `COUSR2AI/COUSR2AO` | User update |
| `COUSR03.CPY` | `COUSR3AI/COUSR3AO` | User delete |

---

## Dead Code

| Copybook | Record | Reason |
|---|---|---|
| `UNUSED1Y.cpy` | `UNUSED-DATA` | Identical structure to `SEC-USER-DATA` (CSUSR01Y). Field names use `UNUSED-` prefix. Never referenced. **Do not migrate.** |

---

## COBOL Type Mapping Reference

| PIC Clause | Storage | TypeScript Type | PostgreSQL Type | Rule |
|---|---|---|---|---|
| `PIC X(n)` | EBCDIC chars | `string` | `VARCHAR(n)` or `CHAR(n)` | EBCDIC→UTF-8 conversion required |
| `PIC 9(n)` n≤9 | Zoned decimal | `number` | `INTEGER` | |
| `PIC 9(n)` n≥10 | Zoned decimal | `bigint` (or string for ID columns) | `BIGINT` | |
| `PIC S9(n)V9(m)` | Zoned decimal + sign | `Decimal` (Decimal.js) | `NUMERIC(n+m, m)` | **NEVER float/double** |
| `PIC 9(n) COMP-3` | Packed decimal | `number` / `bigint` | `INTEGER`/`BIGINT` | No fractional part |
| `PIC S9(n)V9(m) COMP-3` | Packed decimal | `Decimal` | `NUMERIC(n+m, m)` | 2 digits/byte + sign nibble |
| `PIC 9(n) COMP` (TRUNC STD) | Binary | `number` / `bigint` | `INTEGER`/`BIGINT` | Range limited by PIC, not full word |
| `PIC S9(n)V9(m) COMP` | Binary with implied decimal | `Decimal` | `NUMERIC(n+m, m)` | Unusual; divide binary by 10^m |
| `PIC X(10)` (date) | EBCDIC string | `Date` | `DATE` | Format YYYY-MM-DD |
| `PIC X(26)` (timestamp) | EBCDIC string | `Date` | `TIMESTAMP` | Format `YYYY-MM-DD HH:MM:SS.ssssss` |

### COMP vs COMP-3 vs COMP-5

| Type | Under TRUNC(STD) | Under TRUNC(BIN) |
|---|---|---|
| `COMP` (`BINARY`) | Range limited to PIC digits | Full binary word range |
| `COMP-5` | Full binary word range always | Full binary word range |
| `COMP-3` | Always packed decimal; range from PIC | Same |

IBM Enterprise COBOL defaults to `TRUNC(STD)`. **Check compile JCL for `CBL` or
`PROCESS` cards** to confirm. If `TRUNC(BIN)` is set, COMP fields use full word
range and TypeScript validation ranges must be adjusted accordingly.

### COMP Range Validation (TRUNC STD)

```typescript
// PIC 9(9) COMP with TRUNC(STD) — max 999_999_999, not Number.MAX_SAFE_INTEGER
export class ExportRecord {
  @IsInt()
  @Min(0)
  @Max(999_999_999)
  exportSequenceNum!: number;
}
```

---

## Data Migration Notes

### EBCDIC Conversion

All `PIC X` fields on the mainframe are stored in EBCDIC. During data export and
migration:

1. **Code page:** Assume IBM CP037 (US EBCDIC) unless JCL or system docs specify
   otherwise. CP500 (International) or CP1140 (Euro) differ in specific characters.
2. **Sort order:** EBCDIC sort order differs from UTF-8. In EBCDIC, lowercase
   letters sort *before* uppercase. Any TypeScript or SQL logic relying on
   character ordering must be reviewed.
3. **Space padding:** COBOL `PIC X` fields are right-padded with spaces. Strip
   trailing spaces during migration (`str.trimEnd()` / `RTRIM`).
4. **Packed decimal (COMP-3):** Not character data — raw bytes. Convert using a
   packed decimal decoder before character conversion applies.

### Packed Decimal (COMP-3) Conversion

COMP-3 fields store two decimal digits per byte. The last nibble (half-byte) is
the sign: `0x0C` = positive, `0x0D` = negative, `0x0F` = unsigned.

Example — `PIC S9(09)V99 COMP-3` value `$12345.67`:
- Stored as: `01 23 45 67 0C` (6 bytes)
- Convert to `new Decimal("12345.67")`

TypeScript decode:
```typescript
import { Decimal } from 'decimal.js';

export function decodeComp3(bytes: Uint8Array, scale: number): Decimal {
  const digits: string[] = [];
  for (let i = 0; i < bytes.length - 1; i++) {
    digits.push(((bytes[i] >> 4) & 0xf).toString());
    digits.push((bytes[i] & 0xf).toString());
  }
  const lastByte = bytes[bytes.length - 1];
  digits.push(((lastByte >> 4) & 0xf).toString());
  const signNibble = lastByte & 0xf;
  const negative = signNibble === 0xd;
  const result = new Decimal(digits.join('')).div(new Decimal(10).pow(scale));
  return negative ? result.negated() : result;
}
```

### Sign Handling for Zoned Decimal (COMP-0 / display)

Fields like `PIC S9(10)V99` (no COMP) use **trailing overpunch** in EBCDIC:
- The last digit byte encodes the sign in the zone nibble
- Positive: `C` zone (`{ABCDEFGHI` = 0–9)
- Negative: `D` zone (`}JKLMNOPQR` = 0–9)

The migration code must use an overpunch decoder for VSAM file data. If data
has already been converted to display strings (e.g., via `DD DISP=SHR` export),
check if the sign was preserved or converted to standard `+`/`-`.

### Date Fields

All date fields use `PIC X(10)` with `YYYY-MM-DD` format (confirmed by field
names). Parse with date-fns `parseISO()` (or `Temporal.PlainDate.from()`).
No Y2K ambiguity for this format.

Timestamp fields (`TRAN-ORIG-TS`, `TRAN-PROC-TS`) are `PIC X(26)` with format
`YYYY-MM-DD HH:MM:SS.ssssss`. Parse with date-fns `parse()` using a custom
format string, or `Temporal.PlainDateTime`.

### OCCURS and Variable-Length Records

- `EXP-CUST-ADDR-LINES OCCURS 3 TIMES` → denormalize to 3 columns in SQL, or
  store as `VARCHAR(150)[]` PostgreSQL array.
- `EXP-CUST-PHONE-NUMS OCCURS 2 TIMES` → denormalize to 2 columns, or array.
- `COCOM01Y CDEMO-MENU-OPTIONS OCCURS 12 TIMES` → working storage only; no SQL.

---

## Security Findings

| Finding | Severity | Copybook | Field | Recommendation |
|---|---|---|---|---|
| Plaintext password storage | **CRITICAL** | `CSUSR01Y` | `SEC-USR-PWD PIC X(08)` | Hash with bcrypt (cost≥12) or Argon2id before migration. Never store plaintext. |
| CVV persistence | **HIGH** | `CVACT02Y` | `CARD-CVV-CD PIC 9(03)` | Per PCI DSS 3.3: delete after authorization. Do not migrate to PostgreSQL. |
| SSN as plain integer | **HIGH** | `CVCUS01Y` | `CUST-SSN PIC 9(09)` | Encrypt at column level or tokenize. Consider `pgcrypto` or application-level AES-256. |
| PII in plain text | **MEDIUM** | `CVCUS01Y` | DOB, govt ID, address | Apply column encryption or PostgreSQL row security policies for PII fields. |
| No password complexity | **MEDIUM** | `CSUSR01Y` | 8-char max password | The NestJS auth layer must enforce modern password policy on account creation/update. |

---

## Validation Checklist

- [x] No COBOL decimal field (V in PIC) maps to `float`/`double`
- [x] All `COMP-3` fields with decimal (V) map to `Decimal` (Decimal.js)
- [x] Date fields (`PIC X(10)` with date names) map to JavaScript `Date` / `Temporal.PlainDate`
- [x] Timestamp fields (`PIC X(26)`) map to JavaScript `Date` / `Temporal.PlainDateTime`
- [x] `REDEFINES` structures have discriminator field identified (`EXPORT-REC-TYPE`)
- [x] `OCCURS` fields have max sizes annotated (`OCCURS 3 TIMES`, `OCCURS 2 TIMES`)
- [x] No `PIC X` field exceeds `VARCHAR(4000)` — largest is `PIC X(178)` FILLER
- [x] 88-level conditions captured (user type, program context, AID keys)
- [x] `COMP` fields have TRUNC(STD) range validation noted
- [x] Security findings documented (plaintext password, CVV, SSN)
- [x] Dead code identified (`UNUSED1Y`, duplicate `CUSTREC`)
- [x] All 29 copybooks in `app/cpy/` analyzed
- [x] All 17 BMS screen maps in `app/cpy-bms/` analyzed
