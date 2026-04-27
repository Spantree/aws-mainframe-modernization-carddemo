/**
 * Generated from CBACT01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBACT01C — Read account VSAM; write sequential/array/varlen.
 * Complexity: 1.55 (Easy).
 *   Reads ACCTFILE sequentially. For each record:
 *   1. Displays account fields (debug log).
 *   2. Writes a flat record to OUT-FILE (sequential).
 *   3. Writes a 5-element balance array record to ARRY-FILE.
 *   4. Writes two variable-length records (VB1 short / VB2 long) to VBRC-FILE.
 *   Calls assembler routine COBDATFT for date formatting — replaced with
 *   cobol-date.ts helpers.
 *   Business criticality: 2 — read + report; no financial mutation.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountRecord } from '../entities/AccountRecord';
import { parseCobolDate, toCobolDateDash } from '../utils/cobol-date';

export interface AccountFlatRecord {
  /** FD OUT-ACCT-ID — PIC 9(11) */
  accountId: string;
  /** FD OUT-ACCT-ACTIVE-STATUS — PIC X(01) */
  activeStatus: string;
  /** FD OUT-ACCT-CURR-BAL — PIC S9(10)V99 */
  currentBalance: string;
  /** FD OUT-ACCT-CREDIT-LIMIT — PIC S9(10)V99 */
  creditLimit: string;
  /** FD OUT-ACCT-CASH-CREDIT-LIMIT — PIC S9(10)V99 */
  cashCreditLimit: string;
  /** FD OUT-ACCT-OPEN-DATE — PIC X(10) */
  openDate: string;
  /** FD OUT-ACCT-EXPIRAION-DATE — PIC X(10) (sic — typo preserved from COBOL) */
  expirationDate: string;
  /** FD OUT-ACCT-REISSUE-DATE — PIC X(10), formatted by COBDATFT */
  reissueDate: string;
  /** FD OUT-ACCT-CURR-CYC-CREDIT — PIC S9(10)V99 */
  currentCycleCredit: string;
  /**
   * FD OUT-ACCT-CURR-CYC-DEBIT — PIC S9(10)V99 USAGE IS COMP-3
   * NOTE: if ACCT-CURR-CYC-DEBIT = 0, COBOL hardcodes 2525.00 here.
   */
  currentCycleDebit: string;
  /** FD OUT-ACCT-GROUP-ID — PIC X(10) */
  groupId: string;
}

export interface AccountArrayRecord {
  /** ARR-ACCT-ID — PIC 9(11) */
  accountId: string;
  /**
   * ARR-ACCT-BAL OCCURS 5 TIMES
   * Elements 1–3 populated; 4–5 remain zero per COBOL source.
   */
  balances: Array<{ currentBalance: string; currentCycleDebit: string }>;
}

export interface AccountVbRecord1 {
  /** VB1-ACCT-ID — PIC 9(11) */
  accountId: string;
  /** VB1-ACCT-ACTIVE-STATUS — PIC X(01) */
  activeStatus: string;
}

export interface AccountVbRecord2 {
  /** VB2-ACCT-ID — PIC 9(11) */
  accountId: string;
  /** VB2-ACCT-CURR-BAL — PIC S9(10)V99 */
  currentBalance: string;
  /** VB2-ACCT-CREDIT-LIMIT — PIC S9(10)V99 */
  creditLimit: string;
  /** VB2-ACCT-REISSUE-YYYY — PIC X(04) */
  reissueYear: string;
}

export interface AccountFileReaderResult {
  flat: AccountFlatRecord[];
  arrays: AccountArrayRecord[];
  vb1Records: AccountVbRecord1[];
  vb2Records: AccountVbRecord2[];
  recordCount: number;
}

/**
 * AccountFileReader — translates CBACT01C batch program.
 *
 * Reads all AccountRecord rows from PostgreSQL (maps to ACCTFILE VSAM KSDS)
 * and produces the four output formats the COBOL program wrote to disk.
 * In the new architecture these outputs are returned in-memory; callers
 * may persist them via their own repository or streaming writer.
 *
 * COBOL paragraph mapping:
 *   0000-ACCTFILE-OPEN       → open (implicit via repository)
 *   1000-ACCTFILE-GET-NEXT   → processAccount()
 *   1100-DISPLAY-ACCT-RECORD → logAccount() [debug]
 *   1300-POPUL-ACCT-RECORD   → buildFlatRecord()
 *   1350-WRITE-ACCT-RECORD   → pushed to flat[]
 *   1400-POPUL-ARRAY-RECORD  → buildArrayRecord()
 *   1450-WRITE-ARRY-RECORD   → pushed to arrays[]
 *   1500-POPUL-VBRC-RECORD   → buildVbRecords()
 *   1550/1575-WRITE-VB*      → pushed to vb1Records[]/vb2Records[]
 *   9000-ACCTFILE-CLOSE      → implicit (repository lifecycle)
 */
@Injectable()
export class AccountFileReader {
  private readonly logger = new Logger(AccountFileReader.name);

  /** WS-PGMNAME PIC X(08) VALUE 'CBACT01C' */
  private readonly programName = 'CBACT01C';

  constructor(
    @InjectRepository(AccountRecord)
    private readonly accountRepo: Repository<AccountRecord>,
  ) {}

  /**
   * Main entry point — maps to CBACT01C PROCEDURE DIVISION.
   * Streams all accounts and produces the four output collections.
   */
  async run(): Promise<AccountFileReaderResult> {
    this.logger.log(`START OF EXECUTION OF PROGRAM ${this.programName}`);

    const result: AccountFileReaderResult = {
      flat: [],
      arrays: [],
      vb1Records: [],
      vb2Records: [],
      recordCount: 0,
    };

    // PERFORM UNTIL END-OF-FILE — sequential read of all accounts
    const accounts = await this.accountRepo.find({ order: { accountId: 'ASC' } });

    for (const acct of accounts) {
      // 1100-DISPLAY-ACCT-RECORD
      this.logAccount(acct);

      // 1300-POPUL-ACCT-RECORD + 1350-WRITE-ACCT-RECORD
      result.flat.push(this.buildFlatRecord(acct));

      // 1400-POPUL-ARRAY-RECORD + 1450-WRITE-ARRY-RECORD
      result.arrays.push(this.buildArrayRecord(acct));

      // 1500-POPUL-VBRC-RECORD + 1550/1575-WRITE-VB*-RECORD
      const { vb1, vb2 } = this.buildVbRecords(acct);
      result.vb1Records.push(vb1);
      result.vb2Records.push(vb2);

      result.recordCount++;
    }

    this.logger.log(`END OF EXECUTION OF PROGRAM ${this.programName}`);
    return result;
  }

  /**
   * 1100-DISPLAY-ACCT-RECORD — debug logging.
   */
  private logAccount(acct: AccountRecord): void {
    this.logger.debug(`ACCT-ID: ${acct.accountId}`);
    this.logger.debug(`ACCT-ACTIVE-STATUS: ${acct.activeStatus}`);
    this.logger.debug(`ACCT-CURR-BAL: ${acct.currentBalance}`);
    this.logger.debug(`ACCT-CREDIT-LIMIT: ${acct.creditLimit}`);
    this.logger.debug('---');
  }

  /**
   * 1300-POPUL-ACCT-RECORD
   *
   * NOTE: COBOL calls COBDATFT assembler routine to reformat REISSUE-DATE.
   * Replacement: parseCobolDate + toCobolDateDash from cobol-date.ts.
   * COBOL also hardcodes currentCycleDebit to 2525.00 when the field is zero.
   */
  private buildFlatRecord(acct: AccountRecord): AccountFlatRecord {
    const rawDebit = Number(acct.currentCycleDebit ?? 0);
    const currentCycleDebit = rawDebit === 0 ? '2525.00' : String(rawDebit.toFixed(2));

    // CODATECN-TYPE '2', CODATECN-OUTTYPE '2' → normalise reissue date to YYYY-MM-DD
    const parsed = parseCobolDate(acct.reissueDate);
    const reissueDate = parsed ? toCobolDateDash(parsed) : '          ';

    return {
      accountId: String(acct.accountId).padStart(11, '0'),
      activeStatus: acct.activeStatus ?? ' ',
      currentBalance: Number(acct.currentBalance ?? 0).toFixed(2),
      creditLimit: Number(acct.creditLimit ?? 0).toFixed(2),
      cashCreditLimit: Number(acct.cashCreditLimit ?? 0).toFixed(2),
      openDate: acct.openDate ?? '          ',
      expirationDate: acct.expirationDate ?? '          ',
      reissueDate,
      currentCycleCredit: Number(acct.currentCycleCredit ?? 0).toFixed(2),
      currentCycleDebit,
      groupId: (acct.groupId ?? '          ').padEnd(10),
    };
  }

  /**
   * 1400-POPUL-ARRAY-RECORD
   *
   * COBOL ARR-ACCT-BAL OCCURS 5 TIMES — elements 4 and 5 left at zero.
   * Element 3 currentBalance is hardcoded negative in the COBOL source
   * (-1025.00 / -2500.00) — preserved here as-is.
   */
  private buildArrayRecord(acct: AccountRecord): AccountArrayRecord {
    const bal = Number(acct.currentBalance ?? 0).toFixed(2);
    return {
      accountId: String(acct.accountId).padStart(11, '0'),
      balances: [
        { currentBalance: bal, currentCycleDebit: '1005.00' },
        { currentBalance: bal, currentCycleDebit: '1525.00' },
        { currentBalance: '-1025.00', currentCycleDebit: '-2500.00' },
        { currentBalance: '0.00', currentCycleDebit: '0.00' },
        { currentBalance: '0.00', currentCycleDebit: '0.00' },
      ],
    };
  }

  /**
   * 1500-POPUL-VBRC-RECORD
   *
   * VB1 is 12 bytes (ID + active status).
   * VB2 is 39 bytes (ID + bal + limit + reissue year).
   */
  private buildVbRecords(acct: AccountRecord): {
    vb1: AccountVbRecord1;
    vb2: AccountVbRecord2;
  } {
    const accountId = String(acct.accountId).padStart(11, '0');
    const reissueYear = acct.reissueDate
      ? String(acct.reissueDate).substring(0, 4)
      : '    ';

    return {
      vb1: {
        accountId,
        activeStatus: acct.activeStatus ?? ' ',
      },
      vb2: {
        accountId,
        currentBalance: Number(acct.currentBalance ?? 0).toFixed(2),
        creditLimit: Number(acct.creditLimit ?? 0).toFixed(2),
        reissueYear,
      },
    };
  }
}
