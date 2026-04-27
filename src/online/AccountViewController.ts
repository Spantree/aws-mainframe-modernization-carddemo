/**
 * Generated from COACTVWC.cbl — CardDemo TypeScript migration
 * Original COBOL program: Account view — CICS screen for displaying full account details.
 * Complexity: 2.8 (Moderate).
 *   Transaction ID: CACV. Accepts an account ID from the COMMAREA or screen input,
 *   reads ACCTDAT and CARDFILE/CARDXREF, then sends account details back to the
 *   3270 map. PF3 returns to the main menu (COMEN01C). PF12 cancels.
 *   Business criticality: 2 — read-only display; no writes.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → getAccount()
 *   PROCESS-ENTER-KEY     → lookupAccount()
 *   RETURN-TO-PREV-SCREEN → (handled by frontend routing)
 *   READ-ACCTDAT-FILE     → accountRepository.findOneBy()
 *   SEND-ACCTVIEW-SCREEN  → AccountViewResponse
 */

import {
  Controller,
  Get,
  Query,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountRecord } from '../entities/AccountRecord';
import { CardRecord } from '../entities/CardRecord';
import { CardCrossReference } from '../entities/CardCrossReference';

export interface AccountViewResponse {
  /** ACCT-ID — PIC 9(11) */
  accountId: string;
  /** ACCT-ACTIVE-STATUS — PIC X(01) */
  activeStatus: string;
  /** ACCT-CURR-BAL — PIC S9(10)V99 COMP-3 */
  currentBalance: string;
  /** ACCT-CREDIT-LIMIT — PIC S9(10)V99 COMP-3 */
  creditLimit: string;
  /** ACCT-CASH-CREDIT-LIMIT — PIC S9(10)V99 COMP-3 */
  cashCreditLimit: string;
  /** ACCT-OPEN-DATE — PIC X(10) */
  openDate: string;
  /** ACCT-EXPIRAION-DATE — PIC X(10) */
  expirationDate: string;
  /** ACCT-REISSUE-DATE — PIC X(10) */
  reissueDate: string;
  /** ACCT-CURR-CYC-CREDIT — PIC S9(10)V99 COMP-3 */
  currentCycleCredit: string;
  /** ACCT-CURR-CYC-DEBIT — PIC S9(10)V99 COMP-3 */
  currentCycleDebit: string;
  /** ACCT-GROUP-ID — PIC X(10) */
  groupId: string;
  /** ACCT-ADDR-ZIP — PIC X(10) */
  addressZip: string;
  /** Associated card number (from CARDXREF lookup) — PIC X(16) */
  cardNumber?: string;
}

@Controller('accounts')
export class AccountViewController {
  private readonly logger = new Logger(AccountViewController.name);

  constructor(
    @InjectRepository(AccountRecord)
    private readonly accountRepository: Repository<AccountRecord>,

    @InjectRepository(CardRecord)
    private readonly cardRepository: Repository<CardRecord>,

    @InjectRepository(CardCrossReference)
    private readonly cardXrefRepository: Repository<CardCrossReference>,
  ) {}

  /**
   * View account details by account ID.
   *
   * COBOL equivalent: PROCESS-ENTER-KEY / READ-ACCTDAT-FILE
   * CICS command: EXEC CICS READ FILE('ACCTDAT') INTO(ACCOUNT-RECORD)
   *               RIDFLD(ACCT-ID) RESP(WS-RESP-CD)
   *
   * In COBOL, the account ID comes in via COMMAREA (CDEMO-ACCT-ID) or direct
   * screen input. Here it is a required query parameter.
   */
  @Get('view')
  async getAccount(
    @Query('accountId') accountId: string,
  ): Promise<AccountViewResponse> {
    if (!accountId || !/^\d{1,11}$/.test(accountId.trim())) {
      throw new BadRequestException(
        'accountId must be a numeric string up to 11 digits',
      );
    }

    const paddedId = accountId.trim().padStart(11, '0');

    // READ FILE('ACCTDAT') equivalent
    const account = await this.accountRepository.findOneBy({
      accountId: paddedId,
    });

    if (!account) {
      this.logger.warn(`Account not found: ${paddedId}`);
      throw new NotFoundException(`Account ${paddedId} not found`);
    }

    // READ FILE('CXACAIX') — look up card number via cross-reference
    let cardNumber: string | undefined;
    try {
      const xref = await this.cardXrefRepository.findOneBy({
        accountId: Number(paddedId),
      });
      if (xref) {
        cardNumber = xref.cardNumber;
      }
    } catch (err) {
      this.logger.warn(`Card xref lookup failed for account ${paddedId}: ${err}`);
    }

    return {
      accountId: account.accountId,
      activeStatus: account.activeStatus,
      currentBalance: account.currentBalance,
      creditLimit: account.creditLimit,
      cashCreditLimit: account.cashCreditLimit,
      openDate: account.openDate,
      expirationDate: account.expirationDate,
      reissueDate: account.reissueDate,
      currentCycleCredit: account.currentCycleCredit,
      currentCycleDebit: account.currentCycleDebit,
      groupId: account.groupId,
      addressZip: account.addressZip,
      cardNumber,
    };
  }
}
