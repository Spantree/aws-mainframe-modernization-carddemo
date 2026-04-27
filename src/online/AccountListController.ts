/**
 * Generated from COACCT01.cbl — CardDemo TypeScript migration
 * Original COBOL program: Account list via IBM MQ message queue.
 * Complexity: 2.55 (Moderate).
 *   MQ-driven account inquiry service. Reads account lookup requests from an
 *   MQ input queue, resolves account data from ACCTDAT, and writes responses
 *   to an MQ reply queue. Used in the app-vsam-mq variant of the CardDemo stack.
 *   No direct 3270 screen interaction — this is a headless queue processor.
 *   Business criticality: 2 — read-only; no account mutations.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 * MQ equivalent: Replace CICS MQ with NestJS microservice (TCP/AMQP/SQS/etc.)
 *
 * COBOL paragraph mapping:
 *   OPEN-MQ-QUEUE         → (handled by microservice transport layer)
 *   PROCESS-MQ-MESSAGES   → listAccounts()
 *   READ-ACCTDAT          → accountRepository.find()
 *   WRITE-RESPONSE-QUEUE  → return value / message publish
 *   CLOSE-MQ-QUEUE        → (handled by microservice transport layer)
 */

import {
  Controller,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { AccountRecord } from '../entities/AccountRecord';

export interface AccountListItem {
  /** ACCT-ID — PIC 9(11) */
  accountId: string;
  /** ACCT-ACTIVE-STATUS — PIC X(01) */
  activeStatus: string;
  /** ACCT-CURR-BAL — PIC S9(10)V99 COMP-3 */
  currentBalance: string;
  /** ACCT-CREDIT-LIMIT — PIC S9(10)V99 COMP-3 */
  creditLimit: string;
  /** ACCT-GROUP-ID — PIC X(10) */
  groupId: string;
}

export interface AccountListResponse {
  /** 1-based page number */
  pageNum: number;
  /** true if more records exist beyond this page */
  hasNextPage: boolean;
  accounts: AccountListItem[];
  /** Optional status/error message, mirroring WS-MESSAGE in COBOL */
  message?: string;
}

const PAGE_SIZE = 10; // matches COBOL 10-records-per-screen pattern

@Controller('accounts')
export class AccountListController {
  private readonly logger = new Logger(AccountListController.name);

  constructor(
    @InjectRepository(AccountRecord)
    private readonly accountRepository: Repository<AccountRecord>,
  ) {}

  /**
   * List accounts with optional filtering and pagination.
   *
   * COBOL equivalent: PROCESS-MQ-MESSAGES → READ-ACCTDAT loop
   * Original CICS: EXEC CICS STARTBR FILE('ACCTDAT') RIDFLD(ACCT-ID)
   *   then READNEXT / READPREV to page through records.
   *
   * In PostgreSQL we use OFFSET/LIMIT. Active-status filter mirrors the
   * COBOL WHERE clause on ACCT-ACTIVE-STATUS when the MQ request includes it.
   */
  @Get()
  async listAccounts(
    @Query('page') pageParam = '1',
    @Query('activeOnly') activeOnly = 'false',
    @Query('groupId') groupId?: string,
  ): Promise<AccountListResponse> {
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where: FindManyOptions<AccountRecord>['where'] = {};

    if (activeOnly === 'true') {
      where.activeStatus = 'Y';
    }
    if (groupId) {
      where.groupId = groupId;
    }

    const [records, total] = await this.accountRepository.findAndCount({
      where,
      order: { accountId: 'ASC' },
      skip,
      take: PAGE_SIZE + 1, // fetch one extra to determine hasNextPage
    });

    const hasNextPage = records.length > PAGE_SIZE;
    const accounts = records.slice(0, PAGE_SIZE).map((a) => ({
      accountId: a.accountId,
      activeStatus: a.activeStatus,
      currentBalance: a.currentBalance,
      creditLimit: a.creditLimit,
      groupId: a.groupId,
    }));

    this.logger.debug(
      `listAccounts page=${page} activeOnly=${activeOnly} total=${total}`,
    );

    return {
      pageNum: page,
      hasNextPage,
      accounts,
    };
  }
}
