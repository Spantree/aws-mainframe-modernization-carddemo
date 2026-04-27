/**
 * Generated from CVEXPORT.cpy — CardDemo TypeScript migration
 * Original COBOL program: Multi-record export layout for branch migration (RECLN 500).
 *   Defines a discriminated-union sequential file used by CBEXPORT (batch export) and
 *   CBIMPORT (batch import). The record type field (EXPORT-REC-TYPE) determines which
 *   REDEFINES overlay is active:
 *     'C' → EXPORT-CUSTOMER-DATA  (from CVCUS01Y)
 *     'A' → EXPORT-ACCOUNT-DATA   (from CVACT01Y)
 *     'T' → EXPORT-TRANSACTION-DATA (from CVTRA05Y)
 *     'X' → EXPORT-CARD-XREF-DATA (from CVACT03Y)
 *     'K' → EXPORT-CARD-DATA      (from CVACT02Y)
 *   EXPORT-SEQUENCE-NUM (PIC 9(9) COMP) provides ordering within a batch run.
 *   EXPORT-BRANCH-ID / EXPORT-REGION-CODE support multi-branch deployments.
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COMP-3 note: EXP-ACCT-CURR-BAL, EXP-ACCT-CASH-CREDIT-LIMIT, EXP-TRAN-AMT,
 * EXP-CUST-FICO-CREDIT-SCORE are COMP-3 packed decimal. Use Decimal.js for arithmetic.
 */

// ── Discriminated record type ──────────────────────────────────────────────

export type ExportRecordType = 'C' | 'A' | 'T' | 'X' | 'K';

// ── Base header (common to all record types) ──────────────────────────────

export interface IExportRecordHeader {
  /** EXPORT-REC-TYPE — PIC X(1): 'C'|'A'|'T'|'X'|'K' */
  recordType: ExportRecordType;
  /** EXPORT-TIMESTAMP — PIC X(26) ISO 8601 timestamp */
  exportTimestamp: string;
  /** EXPORT-SEQUENCE-NUM — PIC 9(9) COMP; ordering within a batch run */
  sequenceNum: number;
  /** EXPORT-BRANCH-ID — PIC X(4) */
  branchId: string;
  /** EXPORT-REGION-CODE — PIC X(5) */
  regionCode: string;
}

// ── Per-type payload interfaces (REDEFINES EXPORT-RECORD-DATA) ────────────

/** EXPORT-CUSTOMER-DATA — from CVCUS01Y.cpy */
export interface IExportCustomerData {
  customerId: number;        // PIC 9(09) COMP
  firstName: string;         // PIC X(25)
  middleName: string;        // PIC X(25)
  lastName: string;          // PIC X(25)
  addrLine1: string;         // PIC X(50) (OCCURS 3 TIMES → line 1)
  addrLine2: string;         // PIC X(50)
  addrLine3: string;         // PIC X(50)
  addrStateCd: string;       // PIC X(02)
  addrCountryCd: string;     // PIC X(03)
  addrZip: string;           // PIC X(10)
  phoneNum1: string;         // PIC X(15) (OCCURS 2 TIMES → num 1)
  phoneNum2: string;         // PIC X(15)
  ssn: number;               // PIC 9(09) — handle with care (PII)
  govtIssuedId: string;      // PIC X(20)
  dobYyyyMmDd: string;       // PIC X(10)
  eftAccountId: string;      // PIC X(10)
  primaryCardHolderInd: string; // PIC X(01)
  ficoCreditScore: number;   // PIC 9(03) COMP-3
}

/** EXPORT-ACCOUNT-DATA — from CVACT01Y.cpy */
export interface IExportAccountData {
  accountId: number;         // PIC 9(11)
  activeStatus: string;      // PIC X(01)
  currentBalance: string;    // PIC S9(10)V99 COMP-3 — use Decimal.js
  creditLimit: string;       // PIC S9(10)V99
  cashCreditLimit: string;   // PIC S9(10)V99 COMP-3 — use Decimal.js
  openDate: string;          // PIC X(10)
  expirationDate: string;    // PIC X(10)
  reissueDate: string;       // PIC X(10)
  currentCycleCredit: string; // PIC S9(10)V99
  currentCycleDebit: string; // PIC S9(10)V99 COMP
  addressZip: string;        // PIC X(10)
  groupId: string;           // PIC X(10)
}

/** EXPORT-TRANSACTION-DATA — from CVTRA05Y.cpy */
export interface IExportTransactionData {
  transactionId: string;     // PIC X(16)
  tranTypeCd: string;        // PIC X(02)
  tranCatCd: number;         // PIC 9(04)
  tranSource: string;        // PIC X(10)
  tranDesc: string;          // PIC X(100)
  tranAmt: string;           // PIC S9(09)V99 COMP-3 — use Decimal.js
  merchantId: number;        // PIC 9(09) COMP
  merchantName: string;      // PIC X(50)
  merchantCity: string;      // PIC X(50)
  merchantZip: string;       // PIC X(10)
  cardNumber: string;        // PIC X(16)
  tranOrigTs: string;        // PIC X(26)
  tranProcTs: string;        // PIC X(26)
}

/** EXPORT-CARD-XREF-DATA — from CVACT03Y.cpy */
export interface IExportCardXrefData {
  cardNumber: string;        // PIC X(16)
  customerId: number;        // PIC 9(09)
  accountId: number;         // PIC 9(11) COMP
}

/** EXPORT-CARD-DATA — from CVACT02Y.cpy */
export interface IExportCardData {
  cardNumber: string;        // PIC X(16)
  accountId: number;         // PIC 9(11) COMP
  cvvCode: number;           // PIC 9(03) COMP
  embossedName: string;      // PIC X(50)
  expirationDate: string;    // PIC X(10)
  activeStatus: string;      // PIC X(01)
}

// ── Tagged union (discriminated by recordType) ────────────────────────────

export type ExportRecord =
  | (IExportRecordHeader & { recordType: 'C'; data: IExportCustomerData })
  | (IExportRecordHeader & { recordType: 'A'; data: IExportAccountData })
  | (IExportRecordHeader & { recordType: 'T'; data: IExportTransactionData })
  | (IExportRecordHeader & { recordType: 'X'; data: IExportCardXrefData })
  | (IExportRecordHeader & { recordType: 'K'; data: IExportCardData });

// ── Type guard helpers ────────────────────────────────────────────────────

export function isCustomerExport(
  r: ExportRecord,
): r is IExportRecordHeader & { recordType: 'C'; data: IExportCustomerData } {
  return r.recordType === 'C';
}

export function isAccountExport(
  r: ExportRecord,
): r is IExportRecordHeader & { recordType: 'A'; data: IExportAccountData } {
  return r.recordType === 'A';
}

export function isTransactionExport(
  r: ExportRecord,
): r is IExportRecordHeader & { recordType: 'T'; data: IExportTransactionData } {
  return r.recordType === 'T';
}

export function isCardXrefExport(
  r: ExportRecord,
): r is IExportRecordHeader & { recordType: 'X'; data: IExportCardXrefData } {
  return r.recordType === 'X';
}

export function isCardExport(
  r: ExportRecord,
): r is IExportRecordHeader & { recordType: 'K'; data: IExportCardData } {
  return r.recordType === 'K';
}
