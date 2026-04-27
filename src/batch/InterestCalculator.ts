/**
 * Generated from CBACT04C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBACT04C — Interest calculation batch program. Complexity: 1.85 (Easy).
 *   Reads TCATBAL (transaction category balances) sequentially. For each record:
 *   1. Looks up the card cross-reference to find account group ID.
 *   2. Looks up the disclosure group to find the annual interest rate for that category.
 *   3. Computes monthly interest: balance × (rate / 100) / 12.
 *   4. Writes an interest transaction to TRANSACT and updates ACCTFILE current balance.
 *   Business Criticality: 5 — financial mutation, exact decimal arithmetic required.
 *   Files accessed: TCATBALF (seq), XREFFILE (random), DISCGRP (random), ACCTFILE (I-O),
 *   TRANSACT (output).
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Decimal,
  toDecimal,
  computeMonthlyInterest,
  decimalToString,
} from '../utils/decimal';
import { toCardDemoTimestamp } from '../utils/cobol-date';
import { TransactionCategoryBalance } from '../entities/TransactionCategoryBalance';
import { CardCrossReference } from '../entities/CardCrossReference';
import { DisclosureGroup } from '../entities/DisclosureGroup';
import { AccountRecord } from '../entities/AccountRecord';
import { TransactionRecord } from '../entities/TransactionRecord';

/** COBOL CBACT04C 1100-WRITE-TRANSACT-FILE: type 'IN', category 05. */
const INTEREST_TRAN_TYPE_CODE = '01';
const INTEREST_TRAN_CATEGORY_CODE = 5;
/** Fallback group used when an account's specific group has no rate row. */
const DEFAULT_DISCLOSURE_GROUP_ID = 'DEFAULT';

/** Result counters — equivalent to COBOL working-storage counters */
export interface InterestCalculatorResult {
  recordsProcessed: number;
  interestChargesPosted: number;
  zeroInterestSkipped: number;
  errors: number;
  totalInterestCharged: string; // Decimal as string
}

@Injectable()
export class InterestCalculator {
  private readonly logger = new Logger(InterestCalculator.name);

  constructor(
    @InjectRepository(TransactionCategoryBalance)
    private readonly tcatBalRepository: Repository<TransactionCategoryBalance>,

    @InjectRepository(CardCrossReference)
    private readonly xrefRepository: Repository<CardCrossReference>,

    @InjectRepository(DisclosureGroup)
    private readonly disclosureGroupRepository: Repository<DisclosureGroup>,

    @InjectRepository(AccountRecord)
    private readonly accountRepository: Repository<AccountRecord>,

    @InjectRepository(TransactionRecord)
    private readonly transactionRepository: Repository<TransactionRecord>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Main entry point — equivalent to COBOL PROCEDURE DIVISION / MAIN-PARA.
   * COBOL flow:
   *   Open all 5 files
   *   PERFORM UNTIL END-OF-FILE (read TCATBAL sequentially)
   *     PERFORM 1000-LOOKUP-XREF  (find account by card)
   *     PERFORM 1100-LOOKUP-DISCGRP (find interest rate)
   *     PERFORM 1200-COMPUTE-INTEREST
   *     PERFORM 1300-WRITE-INTEREST-TRAN
   *     PERFORM 1400-UPDATE-ACCOUNT
   *   Close all files
   *   GOBACK
   */
  async run(): Promise<InterestCalculatorResult> {
    this.logger.log('START OF EXECUTION OF PROGRAM CBACT04C');

    const result: InterestCalculatorResult = {
      recordsProcessed: 0,
      interestChargesPosted: 0,
      zeroInterestSkipped: 0,
      errors: 0,
      totalInterestCharged: '0.00',
    };

    let runningTotal = new Decimal(0);

    // CBACT04C reads TCATBALF in the order it was loaded; using accountId as the
    // primary sort lets us detect account boundaries — the trigger for
    // 1050-UPDATE-ACCOUNT (rewrite balance + zero cycle credit/debit).
    const stream = await this.tcatBalRepository
      .createQueryBuilder('tcb')
      .orderBy('tcb.accountId', 'ASC')
      .addOrderBy('tcb.typeCode', 'ASC')
      .addOrderBy('tcb.categoryCode', 'ASC')
      .stream();

    let currentAccountId: string | null = null;
    let currentAccount: AccountRecord | null = null;
    let currentXrefCardNumber = '';
    let perAccountInterest = new Decimal(0);

    for await (const catBal of stream as AsyncIterable<TransactionCategoryBalance>) {
      result.recordsProcessed++;

      // Account boundary — finalise the previous account before processing this row.
      if (currentAccountId !== null && currentAccountId !== catBal.accountId) {
        if (currentAccount) {
          await this.finaliseAccount(currentAccount, perAccountInterest);
        }
        runningTotal = runningTotal.plus(perAccountInterest);
        perAccountInterest = new Decimal(0);
        currentAccount = null;
        currentXrefCardNumber = '';
      }

      if (currentAccountId !== catBal.accountId) {
        currentAccountId = catBal.accountId;
        currentAccount = await this.lookupAccount(catBal.accountId);
        if (!currentAccount) {
          this.logger.warn(`Account ${catBal.accountId} not found — skipping`);
          result.errors++;
          continue;
        }
        // CBACT04C reads XREFFILE by alt-key ACCT-ID for the card-number tag
        // on each interest TRAN row.
        const xref = await this.xrefRepository.findOne({
          where: { accountId: catBal.accountId },
        });
        currentXrefCardNumber = xref?.cardNumber ?? '';
      }

      if (!currentAccount) continue;

      const interest = await this.processOneCategoryBalance(
        catBal,
        currentAccount,
        currentXrefCardNumber,
        result,
      );
      perAccountInterest = perAccountInterest.plus(interest);
    }

    // Flush the final account.
    if (currentAccount) {
      await this.finaliseAccount(currentAccount, perAccountInterest);
      runningTotal = runningTotal.plus(perAccountInterest);
    }

    result.totalInterestCharged = decimalToString(runningTotal);
    this.logger.log(
      `END OF EXECUTION OF PROGRAM CBACT04C — ` +
        `Processed: ${result.recordsProcessed}, Posted: ${result.interestChargesPosted}, ` +
        `Skipped (zero interest): ${result.zeroInterestSkipped}, Errors: ${result.errors}, ` +
        `Total interest: ${result.totalInterestCharged}`,
    );

    return result;
  }

  /**
   * Process one TRAN-CAT-BAL-RECORD: look up rate, compute interest, write the
   * interest TRAN row. The account REWRITE happens once per account in
   * `finaliseAccount` — see CBACT04C 1050-UPDATE-ACCOUNT.
   */
  private async processOneCategoryBalance(
    catBal: TransactionCategoryBalance,
    account: AccountRecord,
    xrefCardNumber: string,
    result: InterestCalculatorResult,
  ): Promise<Decimal> {
    const balance = toDecimal(catBal.balance);

    // 1100-LOOKUP-DISCGRP with 1200-A-GET-DEFAULT-INT-RATE fallback:
    // when the account-group key misses, COBOL re-reads with 'DEFAULT'.
    const discGroup = await this.lookupDisclosureGroup(
      account.groupId,
      catBal.typeCode,
      catBal.categoryCode,
    );

    if (!discGroup) {
      this.logger.debug(
        `No disclosure group for ${account.groupId}/${catBal.typeCode}/${catBal.categoryCode} — skipping`,
      );
      result.zeroInterestSkipped++;
      return new Decimal(0);
    }

    const interestRate = toDecimal(discGroup.interestRate);

    if (interestRate.isZero()) {
      result.zeroInterestSkipped++;
      return new Decimal(0);
    }

    // 1200-COMPUTE-INTEREST: WS-INT-CHARGE = TRAN-CAT-BAL * (DIS-INT-RATE / 100) / 12
    const interestCharge = computeMonthlyInterest(balance, interestRate);

    // 1300-WRITE-INTEREST-TRAN — one row per category, tagged with the xref card.
    await this.writeInterestTransaction(
      catBal.accountId,
      catBal,
      interestCharge,
      xrefCardNumber,
    );

    result.interestChargesPosted++;
    return interestCharge;
  }

  /** ACCTFILE random read by account ID. */
  private async lookupAccount(accountId: string): Promise<AccountRecord | null> {
    return this.accountRepository.findOne({ where: { accountId } });
  }

  /**
   * 1100-LOOKUP-DISCGRP with 1200-A-GET-DEFAULT-INT-RATE fallback.
   * On a NOTFND for the account's specific group, CBACT04C re-reads using the
   * `DEFAULT` group ID so unmapped accounts still see a rate.
   */
  private async lookupDisclosureGroup(
    groupId: string,
    typeCode: string,
    categoryCode: number,
  ): Promise<DisclosureGroup | null> {
    const direct = await this.disclosureGroupRepository.findOne({
      where: { accountGroupId: groupId, typeCode, categoryCode },
    });
    if (direct) return direct;

    return this.disclosureGroupRepository.findOne({
      where: { accountGroupId: DEFAULT_DISCLOSURE_GROUP_ID, typeCode, categoryCode },
    });
  }

  /**
   * 1300-WRITE-INTEREST-TRAN — append an interest TRAN row.
   * COBOL fills TRAN-CARD-NUM with the xref card-number (MOVE XREF-CARD-NUM
   * TO TRAN-CARD-NUM at CBACT04C:495) and tags type=01, category=05.
   */
  private async writeInterestTransaction(
    accountId: string,
    catBal: TransactionCategoryBalance,
    interestCharge: Decimal,
    xrefCardNumber: string,
  ): Promise<void> {
    const now = toCardDemoTimestamp();
    const transactionId = `INT${Date.now().toString().substring(5)}${accountId.padStart(5, '0')}`;
    const interestTran: Partial<TransactionRecord> = {
      transactionId,
      typeCode: INTEREST_TRAN_TYPE_CODE,
      categoryCode: INTEREST_TRAN_CATEGORY_CODE,
      source: 'BATCH',
      description: `Int. for a/c ${accountId}`,
      amount: decimalToString(interestCharge),
      merchantId: 0,
      merchantName: 'INTEREST CHARGE',
      merchantCity: '',
      merchantZip: '',
      cardNumber: xrefCardNumber,
      originTimestamp: now,
      processTimestamp: now,
    };
    await this.transactionRepository.save(interestTran);
    void catBal; // category context is already encoded in the TRAN row's amount + timestamps
  }

  /**
   * 1050-UPDATE-ACCOUNT — once per account boundary:
   *   ADD  WS-TOTAL-INT TO ACCT-CURR-BAL
   *   MOVE 0 TO ACCT-CURR-CYC-CREDIT
   *   MOVE 0 TO ACCT-CURR-CYC-DEBIT
   *   REWRITE ACCOUNT-FILE
   * Wrapped in a DB transaction so the rewrite is atomic; statement
   * generation depends on the cycle counters being zero after this runs.
   */
  private async finaliseAccount(
    account: AccountRecord,
    totalInterest: Decimal,
  ): Promise<void> {
    if (totalInterest.isZero()) {
      // Still reset cycle counters — COBOL does this unconditionally on the
      // account boundary, regardless of WS-TOTAL-INT.
      await this.accountRepository.update(
        { accountId: account.accountId },
        { currentCycleCredit: '0.00', currentCycleDebit: '0.00' },
      );
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const newBal = toDecimal(account.currentBalance).plus(totalInterest);
      await queryRunner.manager.update(
        AccountRecord,
        { accountId: account.accountId },
        {
          currentBalance: decimalToString(newBal),
          currentCycleCredit: '0.00',
          currentCycleDebit: '0.00',
        },
      );
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
