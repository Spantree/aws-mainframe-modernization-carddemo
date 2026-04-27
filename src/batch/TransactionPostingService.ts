/**
 * Generated from CBTRN02C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBTRN02C — Daily transaction posting batch. Complexity: 2.00 (Moderate).
 *   Business Criticality: 5 — revenue-critical. This program moves transactions from the
 *   daily staging file (DALYTRAN) to the permanent transaction file (TRANSACT) while
 *   updating account balances and transaction category balances.
 *   Rejects invalid transactions to DALYREJS (reject file) with a reason code.
 *   Files: DALYTRAN (seq input), TRANSACT (indexed I-O), XREFFILE (random), 
 *          DALYREJS (seq output), ACCTFILE (random I-O), TCATBALF (random I-O).
 *   ACID requirement: Each transaction post must be atomic — either the TRANSACT write,
 *   ACCTFILE update, AND TCATBALF update all succeed, or none do.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { toDecimal, decimalToString, toCardDemoTimestamp } from '../utils/decimal';
import { DailyTransactionRecord } from '../entities/DailyTransactionRecord';
import { TransactionRecord } from '../entities/TransactionRecord';
import { CardCrossReference } from '../entities/CardCrossReference';
import { AccountRecord } from '../entities/AccountRecord';
import { TransactionCategoryBalance } from '../entities/TransactionCategoryBalance';

/** Validation failure reason codes — from WS-VALIDATION-FAIL-REASON in COBOL */
export enum RejectionReasonCode {
  CARD_NOT_FOUND = 1001,
  CARD_INACTIVE = 1002,
  XREF_NOT_FOUND = 1003,
  ACCOUNT_NOT_FOUND = 1004,
  ACCOUNT_INACTIVE = 1005,
  CREDIT_LIMIT_EXCEEDED = 1006,
  DUPLICATE_TRANSACTION = 1007,
  ZERO_AMOUNT = 1008,
}

export interface PostingResult {
  transactionsPosted: number;
  transactionsRejected: number;
  rejections: Array<{ transactionId: string; reason: RejectionReasonCode; description: string }>;
  totalAmountPosted: string;
}

@Injectable()
export class TransactionPostingService {
  private readonly logger = new Logger(TransactionPostingService.name);

  constructor(
    @InjectRepository(DailyTransactionRecord)
    private readonly dalytranRepository: Repository<DailyTransactionRecord>,

    @InjectRepository(TransactionRecord)
    private readonly transactionRepository: Repository<TransactionRecord>,

    @InjectRepository(CardCrossReference)
    private readonly xrefRepository: Repository<CardCrossReference>,

    @InjectRepository(AccountRecord)
    private readonly accountRepository: Repository<AccountRecord>,

    @InjectRepository(TransactionCategoryBalance)
    private readonly tcatBalRepository: Repository<TransactionCategoryBalance>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Main entry point.
   * COBOL flow:
   *   Open 6 files
   *   PERFORM UNTIL END-OF-FILE (DALYTRAN)
   *     PERFORM 1000-PROCESS-TRANSACTION
   *       1100-VALIDATE-TRAN
   *       1200-POST-TRANSACTION (WRITE to TRANSACT)
   *       1300-UPDATE-ACCOUNT   (REWRITE ACCTFILE)
   *       1400-UPDATE-TCATBAL   (REWRITE or WRITE TCATBALF)
   *   Print counters
   *   GOBACK
   */
  async run(): Promise<PostingResult> {
    this.logger.log('START OF EXECUTION OF PROGRAM CBTRN02C');

    const result: PostingResult = {
      transactionsPosted: 0,
      transactionsRejected: 0,
      rejections: [],
      totalAmountPosted: '0.00',
    };

    let totalPosted = new Decimal(0);

    const stagingRecords = await this.dalytranRepository.find({
      order: { transactionId: 'ASC' },
    });

    for (const dalytran of stagingRecords) {
      // 1100-VALIDATE-TRAN
      const rejection = await this.validateTransaction(dalytran);

      if (rejection) {
        result.transactionsRejected++;
        result.rejections.push({
          transactionId: dalytran.transactionId,
          reason: rejection.code,
          description: rejection.description,
        });
        this.logger.warn(
          `Rejected: ${dalytran.transactionId} — [${rejection.code}] ${rejection.description}`,
        );
        continue;
      }

      // 1200-POST-TRANSACTION + 1300-UPDATE-ACCOUNT + 1400-UPDATE-TCATBAL (atomic)
      try {
        await this.postTransaction(dalytran);
        result.transactionsPosted++;
        totalPosted = totalPosted.plus(toDecimal(dalytran.amount));
      } catch (err) {
        this.logger.error(`Failed to post transaction ${dalytran.transactionId}`, err);
        result.transactionsRejected++;
        result.rejections.push({
          transactionId: dalytran.transactionId,
          reason: RejectionReasonCode.DUPLICATE_TRANSACTION,
          description: `Post failed: ${(err as Error).message}`,
        });
      }
    }

    result.totalAmountPosted = decimalToString(totalPosted);

    this.logger.log(
      `END OF EXECUTION OF PROGRAM CBTRN02C — ` +
        `Posted: ${result.transactionsPosted}, Rejected: ${result.transactionsRejected}, ` +
        `Total posted: ${result.totalAmountPosted}`,
    );

    return result;
  }

  /**
   * 1100-VALIDATE-TRAN.
   * COBOL validated card, xref, account existence and active status,
   * and checked credit limit. Returns null if valid.
   */
  private async validateTransaction(
    tran: DailyTransactionRecord,
  ): Promise<{ code: RejectionReasonCode; description: string } | null> {
    const amount = toDecimal(tran.amount);

    if (amount.isZero()) {
      return { code: RejectionReasonCode.ZERO_AMOUNT, description: 'Zero amount transaction' };
    }

    const xref = await this.xrefRepository.findOne({ where: { cardNumber: tran.cardNumber } });
    if (!xref) {
      return { code: RejectionReasonCode.XREF_NOT_FOUND, description: `No xref for card ${tran.cardNumber}` };
    }

    const account = await this.accountRepository.findOne({
      where: { accountId: xref.accountId.toString() },
    });
    if (!account) {
      return { code: RejectionReasonCode.ACCOUNT_NOT_FOUND, description: `Account ${xref.accountId} not found` };
    }

    if (account.activeStatus !== 'Y') {
      return { code: RejectionReasonCode.ACCOUNT_INACTIVE, description: `Account ${xref.accountId} is inactive` };
    }

    // Check credit limit for purchases (positive amounts)
    if (amount.gt(0)) {
      const currentBal = toDecimal(account.currentBalance);
      const creditLimit = toDecimal(account.creditLimit);
      if (currentBal.plus(amount).gt(creditLimit)) {
        return {
          code: RejectionReasonCode.CREDIT_LIMIT_EXCEEDED,
          description: `Would exceed credit limit: ${decimalToString(creditLimit)}`,
        };
      }
    }

    return null; // Valid
  }

  /**
   * 1200-POST-TRANSACTION + 1300-UPDATE-ACCOUNT + 1400-UPDATE-TCATBAL.
   * Atomic DB transaction — replaces VSAM write + rewrite + rewrite.
   * In COBOL these were separate file operations; atomicity came from CICS SYNCPOINT
   * or JES batch checkpoint-restart. Here we use a single PostgreSQL transaction.
   */
  private async postTransaction(dalytran: DailyTransactionRecord): Promise<void> {
    const xref = await this.xrefRepository.findOne({ where: { cardNumber: dalytran.cardNumber } });
    const account = await this.accountRepository.findOne({
      where: { accountId: xref!.accountId.toString() },
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const processTimestamp = toCardDemoTimestamp();

      // 1200-POST-TRANSACTION: write to permanent TRANSACT file
      const tranRecord: Partial<TransactionRecord> = {
        transactionId: dalytran.transactionId,
        typeCode: dalytran.typeCode,
        categoryCode: dalytran.categoryCode,
        source: dalytran.source,
        description: dalytran.description,
        amount: dalytran.amount,
        merchantId: dalytran.merchantId,
        merchantName: dalytran.merchantName,
        merchantCity: dalytran.merchantCity,
        merchantZip: dalytran.merchantZip,
        cardNumber: dalytran.cardNumber,
        originTimestamp: dalytran.originTimestamp,
        processTimestamp,
      };
      await queryRunner.manager.save(TransactionRecord, tranRecord);

      // 1300-UPDATE-ACCOUNT: REWRITE ACCTFILE updating current balance
      const amount = toDecimal(dalytran.amount);
      const currentBal = toDecimal(account!.currentBalance);
      const newBal = currentBal.plus(amount);
      await queryRunner.manager.update(
        AccountRecord,
        { accountId: xref!.accountId.toString() },
        { currentBalance: decimalToString(newBal) },
      );

      // 1400-UPDATE-TCATBAL: REWRITE or WRITE TCATBALF
      // COBOL: if record exists, add to balance; if not, create it (WS-CREATE-TRANCAT-REC)
      let tcatBal = await queryRunner.manager.findOne(TransactionCategoryBalance, {
        where: {
          accountId: xref!.accountId.toString(),
          typeCode: dalytran.typeCode,
          categoryCode: dalytran.categoryCode,
        },
      });

      if (tcatBal) {
        const newTcatBal = toDecimal(tcatBal.balance).plus(amount);
        await queryRunner.manager.update(
          TransactionCategoryBalance,
          {
            accountId: xref!.accountId.toString(),
            typeCode: dalytran.typeCode,
            categoryCode: dalytran.categoryCode,
          },
          { balance: decimalToString(newTcatBal) },
        );
      } else {
        // Create new TCATBAL record (WS-CREATE-TRANCAT-REC = 'Y' path)
        tcatBal = queryRunner.manager.create(TransactionCategoryBalance, {
          accountId: xref!.accountId.toString(),
          typeCode: dalytran.typeCode,
          categoryCode: dalytran.categoryCode,
          balance: dalytran.amount,
        });
        await queryRunner.manager.save(TransactionCategoryBalance, tcatBal);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
