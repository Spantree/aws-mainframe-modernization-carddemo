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
import Decimal from 'decimal.js';
import { toDecimal, computeMonthlyInterest, decimalToString, toCardDemoTimestamp } from '../utils/decimal';
import { TransactionCategoryBalance } from '../entities/TransactionCategoryBalance';
import { CardCrossReference } from '../entities/CardCrossReference';
import { DisclosureGroup } from '../entities/DisclosureGroup';
import { AccountRecord } from '../entities/AccountRecord';
import { TransactionRecord } from '../entities/TransactionRecord';

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

    let totalInterest = new Decimal(0);

    // Stream TCATBAL records sequentially — equivalent to COBOL sequential READ loop
    const stream = await this.tcatBalRepository
      .createQueryBuilder('tcb')
      .orderBy('tcb.accountId', 'ASC')
      .addOrderBy('tcb.typeCode', 'ASC')
      .addOrderBy('tcb.categoryCode', 'ASC')
      .stream();

    await new Promise<void>((resolve, reject) => {
      stream.on('data', async (catBal: TransactionCategoryBalance) => {
        stream.pause(); // Back-pressure: process one at a time
        try {
          const interest = await this.processOneCategoryBalance(catBal, result);
          totalInterest = totalInterest.plus(interest);
        } catch (err) {
          this.logger.error(`Error processing tcatbal ${catBal.accountId}/${catBal.typeCode}/${catBal.categoryCode}`, err);
          result.errors++;
        } finally {
          stream.resume();
        }
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    result.totalInterestCharged = decimalToString(totalInterest);
    this.logger.log(
      `END OF EXECUTION OF PROGRAM CBACT04C — ` +
        `Processed: ${result.recordsProcessed}, Posted: ${result.interestChargesPosted}, ` +
        `Skipped (zero interest): ${result.zeroInterestSkipped}, Errors: ${result.errors}, ` +
        `Total interest: ${result.totalInterestCharged}`,
    );

    return result;
  }

  /**
   * Process one TRAN-CAT-BAL-RECORD through the full interest pipeline.
   * Equivalent to the main loop body in COBOL.
   */
  private async processOneCategoryBalance(
    catBal: TransactionCategoryBalance,
    result: InterestCalculatorResult,
  ): Promise<Decimal> {
    result.recordsProcessed++;

    const balance = toDecimal(catBal.balance);

    // Skip zero or negative balances — no interest on credits
    if (balance.lte(0)) {
      result.zeroInterestSkipped++;
      return new Decimal(0);
    }

    // 1000-LOOKUP-XREF: Get account group ID via card xref
    // COBOL: READ XREF-FILE INTO CARD-XREF-RECORD KEY IS FD-XREF-ACCT-ID
    const account = await this.lookupAccount(catBal.accountId);
    if (!account) {
      this.logger.warn(`Account ${catBal.accountId} not found — skipping`);
      result.errors++;
      return new Decimal(0);
    }

    // 1100-LOOKUP-DISCGRP: Find interest rate for this account group + type + category
    // COBOL: READ DISCGRP-FILE INTO DIS-GROUP-RECORD KEY IS FD-DISCGRP-KEY
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

    // 1200-COMPUTE-INTEREST
    // COBOL: COMPUTE WS-INT-CHARGE = TRAN-CAT-BAL * (DIS-INT-RATE / 100) / 12
    const interestCharge = computeMonthlyInterest(balance, interestRate);

    // 1300-WRITE-INTEREST-TRAN + 1400-UPDATE-ACCOUNT (in a transaction for ACID)
    await this.postInterestCharge(catBal.accountId, account, interestCharge);

    result.interestChargesPosted++;
    return interestCharge;
  }

  /**
   * 1000-LOOKUP-XREF / ACCOUNT lookup.
   * COBOL used VSAM random READ on ACCTFILE by account ID.
   */
  private async lookupAccount(accountId: string): Promise<AccountRecord | null> {
    return this.accountRepository.findOne({ where: { accountId } });
  }

  /**
   * 1100-LOOKUP-DISCGRP.
   * COBOL: READ DISCGRP-FILE with composite key (group-id + type-cd + cat-cd).
   */
  private async lookupDisclosureGroup(
    groupId: string,
    typeCode: string,
    categoryCode: number,
  ): Promise<DisclosureGroup | null> {
    return this.disclosureGroupRepository.findOne({
      where: { accountGroupId: groupId, typeCode, categoryCode },
    });
  }

  /**
   * 1300-WRITE-INTEREST-TRAN + 1400-UPDATE-ACCOUNT.
   * COBOL wrote to TRANSACT (sequential output) and updated ACCTFILE.
   * Here both writes are wrapped in a DB transaction for ACID semantics.
   * In COBOL, SYNCPOINT would have been used if this were a CICS program.
   */
  private async postInterestCharge(
    accountId: string,
    account: AccountRecord,
    interestCharge: Decimal,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = toCardDemoTimestamp();
      const transactionId = `INT${Date.now().toString().substring(5)}${accountId.padStart(5, '0')}`;

      // Write interest transaction record
      // COBOL: WRITE FD-TRANFILE-REC FROM TRAN-RECORD (type 'IN' = Interest)
      const interestTran: Partial<TransactionRecord> = {
        transactionId,
        typeCode: 'IN',
        categoryCode: 0,
        source: 'BATCH',
        description: 'Monthly interest charge',
        amount: decimalToString(interestCharge),
        merchantId: 0,
        merchantName: 'INTEREST CHARGE',
        merchantCity: '',
        merchantZip: '',
        cardNumber: '',
        originTimestamp: now,
        processTimestamp: now,
      };
      await queryRunner.manager.save(TransactionRecord, interestTran);

      // Update account current balance
      // COBOL: ADD WS-INT-CHARGE TO ACCT-CURR-BAL (REWRITE ACCOUNT-FILE)
      const currentBal = toDecimal(account.currentBalance);
      const newBal = currentBal.plus(interestCharge);
      await queryRunner.manager.update(
        AccountRecord,
        { accountId },
        { currentBalance: decimalToString(newBal) },
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
