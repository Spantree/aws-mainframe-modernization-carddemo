/**
 * Generated from COBIL00C.cbl — CardDemo TypeScript migration
 * Original COBOL program: Bill payment — pay account balance in full.
 * Complexity: 2.95 (Moderate).
 *   Transaction ID: CB00. Accepts account/card identification from COMMAREA,
 *   reads the current balance from ACCTDAT, creates a payment transaction in
 *   TRANSACT, and updates the account balance to zero. Requires a confirmation
 *   step before committing (WS-CONF-PAY-FLG). PF3 cancels, ENTER confirms.
 *   Business criticality: 4 — writes to both TRANSACT and ACCTDAT.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → getPaymentSummary() / confirmPayment()
 *   PROCESS-ENTER-KEY     → confirmPayment()
 *   READ-ACCTDAT-FILE     → accountRepository.findOneBy()
 *   WRITE-PROCESSING      → transactionRepository.save() + accountRepository.save()
 *   SEND-BILLPAY-SCREEN   → BillingPaymentResponse
 *
 * Note on TRAN-ID generation: COBOL uses WS-TRAN-ID-NUM = FUNCTION CURRENT-DATE
 * concatenated with a counter. Here we use a UUID truncated to 16 chars, which
 * fits PIC X(16) and preserves uniqueness.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountRecord } from '../entities/AccountRecord';
import { TransactionRecord } from '../entities/TransactionRecord';
import { CardCrossReference } from '../entities/CardCrossReference';
import { randomUUID } from 'crypto';
import {
  Decimal,
  addDecimal,
  decimalToString,
  subtractDecimal,
  toDecimal,
} from '../utils/decimal';

export interface BillingPaymentSummary {
  accountId: string;
  cardNumber: string;
  currentBalance: string;
  /** Amount that will be charged — equals currentBalance for full payoff */
  paymentAmount: string;
  /** ISO timestamp for display */
  asOf: string;
}

export interface ConfirmPaymentRequest {
  accountId: string;
  cardNumber: string;
  /** Expected payment amount — must match server-side balance to prevent TOCTOU */
  expectedPaymentAmount: string;
}

export interface ConfirmPaymentResponse {
  transactionId: string;
  accountId: string;
  paymentAmount: string;
  newBalance: string;
  processedAt: string;
  message: string;
}

/** TRAN-TYPE-CD for bill payment — mirrors CardDemo convention */
const PAYMENT_TRAN_TYPE = '02';
/** TRAN-CAT-CD for payment */
const PAYMENT_TRAN_CAT = 9000;
/** TRAN-SOURCE — mirrors WS-PGMNAME-based source tagging */
const PAYMENT_TRAN_SOURCE = 'COBIL00C ';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    @InjectRepository(AccountRecord)
    private readonly accountRepository: Repository<AccountRecord>,
    @InjectRepository(TransactionRecord)
    private readonly transactionRepository: Repository<TransactionRecord>,
    @InjectRepository(CardCrossReference)
    private readonly cardXrefRepository: Repository<CardCrossReference>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get payment summary for an account — the "display" phase before confirmation.
   * COBOL: SEND-BILLPAY-SCREEN with WS-CONF-PAY-FLG = 'N'
   */
  @Get('payment-summary')
  async getPaymentSummary(
    @Query('accountId') accountId: string,
  ): Promise<BillingPaymentSummary> {
    const account = await this.findAccount(accountId);
    const xref = await this.cardXrefRepository.findOneBy({
      accountId: account.accountId,
    });

    // ACCT-CURR-BAL is PIC S9(10)V99 — use Decimal.js, never parseFloat.
    const balance = toDecimal(account.currentBalance);
    const paymentAmount = decimalToString(
      balance.isNegative() ? new Decimal(0) : balance,
    );

    return {
      accountId: account.accountId,
      cardNumber: xref?.cardNumber ?? '0000000000000000',
      currentBalance: account.currentBalance,
      paymentAmount,
      asOf: new Date().toISOString(),
    };
  }

  /**
   * Confirm and post bill payment — writes to TRANSACT and updates ACCTDAT.
   * COBOL: PROCESS-ENTER-KEY → WRITE-PROCESSING (CICS WRITE + REWRITE)
   *
   * Wrapped in a database transaction to ensure ACID consistency —
   * mirrors the implicit CICS unit-of-work in the original program.
   */
  @Post('confirm-payment')
  async confirmPayment(
    @Body() req: ConfirmPaymentRequest,
  ): Promise<ConfirmPaymentResponse> {
    const { accountId, expectedPaymentAmount } = req;

    const account = await this.findAccount(accountId);
    const currentBalance = toDecimal(account.currentBalance);
    const expectedAmount = toDecimal(expectedPaymentAmount);

    // Guard against stale balance — COBOL uses map re-read; we compare explicitly.
    // Tolerance is one cent, the smallest unit a PIC S9(10)V99 field can represent.
    if (subtractDecimal(currentBalance, expectedAmount).abs().gt(new Decimal('0.01'))) {
      throw new ConflictException(
        `Balance has changed since payment was initiated. ` +
          `Expected ${expectedPaymentAmount}, actual ${account.currentBalance}. ` +
          `Please refresh and re-confirm.`,
      );
    }

    if (currentBalance.lte(0)) {
      throw new BadRequestException(
        'Account balance is zero or credit — no payment required',
      );
    }

    const paymentAmount = currentBalance;
    const tranId = randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
    const now = new Date();
    const processedAt = now.toISOString();

    await this.dataSource.transaction(async (manager) => {
      // EXEC CICS WRITE FILE('TRANSACT') — create payment transaction record
      const tran = manager.create(TransactionRecord, {
        transactionId: tranId,
        typeCode: PAYMENT_TRAN_TYPE,
        categoryCode: PAYMENT_TRAN_CAT,
        source: PAYMENT_TRAN_SOURCE,
        description: `Bill Payment - Account ${account.accountId}`,
        amount: decimalToString(paymentAmount.negated()), // debit to outstanding balance
        cardNumber: req.cardNumber ?? '0000000000000000',
        originTimestamp: processedAt,
        processTimestamp: processedAt,
        merchantId: 0,
        merchantName: 'BILL PAYMENT',
        merchantCity: 'ONLINE',
        merchantZip: '00000',
      });
      await manager.save(TransactionRecord, tran);

      // EXEC CICS REWRITE FILE('ACCTDAT') — zero out the balance
      const newCycleCredit = addDecimal(
        toDecimal(account.currentCycleCredit),
        paymentAmount,
      );
      await manager.update(AccountRecord, { accountId: account.accountId }, {
        currentBalance: '0.00',
        currentCycleCredit: decimalToString(newCycleCredit),
      });
    });

    this.logger.log(
      `Bill payment posted: account=${account.accountId} amount=${decimalToString(paymentAmount)} tranId=${tranId}`,
    );

    return {
      transactionId: tranId,
      accountId: account.accountId,
      paymentAmount: decimalToString(paymentAmount),
      newBalance: '0.00',
      processedAt,
      message: 'Bill payment processed successfully',
    };
  }

  private async findAccount(accountId: string): Promise<AccountRecord> {
    if (!accountId || !/^\d{1,11}$/.test(accountId.trim())) {
      throw new BadRequestException(
        'accountId must be a numeric string up to 11 digits',
      );
    }
    const paddedId = accountId.trim().padStart(11, '0');
    const account = await this.accountRepository.findOneBy({ accountId: paddedId });
    if (!account) {
      throw new NotFoundException(`Account ${paddedId} not found`);
    }
    return account;
  }
}
