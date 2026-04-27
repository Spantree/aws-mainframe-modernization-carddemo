/**
 * Generated from COTRN00C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COTRN00C — Transaction list (paginated VSAM browse).
 * Complexity: 2.15 (Moderate).
 *   Transaction ID: CT00. Lists transactions from TRANSACT file, 10 per page.
 *   Supports PF7 (previous) and PF8 (next) pagination.
 *   On row selection XCTLs to COTRN01C (transaction view).
 *   Business criticality: 2 — read-only display.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → listTransactions()
 *   PROCESS-PF7-KEY       → previousPage()
 *   PROCESS-PF8-KEY       → listTransactions() with page+1
 *   PROCESS-TRAN-SELECT   → selectTransaction()
 *   SEND-TRAN-LIST        → TransactionListResponse
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Session,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionRecord } from '../entities/TransactionRecord';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

export interface TransactionListItem {
  /** TRAN-ID — PIC X(16) */
  tranId: string;
  /** TRAN-TYPE-CD — PIC X(02) */
  tranTypeCd: string;
  /** TRAN-CAT-CD — PIC 9(04) */
  tranCatCd: number;
  /** TRAN-SOURCE — PIC X(10) */
  tranSource: string;
  /** TRAN-AMT — PIC S9(9)V99 */
  tranAmt: string;
  /** TRAN-ORIG-TS — PIC X(26) */
  tranOrigTs: string;
  /** TRAN-CARD-NUM — PIC X(16) */
  tranCardNum: string;
}

export interface TransactionListResponse {
  pageNum: number;
  hasNextPage: boolean;
  transactions: TransactionListItem[];
  message?: string;
}

/**
 * TransactionListController — translates COTRN00C.
 * Transaction ID: CT00
 */
@Controller('transactions')
export class TransactionListController {
  private readonly logger = new Logger(TransactionListController.name);

  private readonly programName = 'COTRN00C';
  private readonly transactionId = 'CT00';
  /** OCCURS 10 TIMES in COBOL screen data */
  private readonly pageSize = 10;

  constructor(
    @InjectRepository(TransactionRecord)
    private readonly transactionRepo: Repository<TransactionRecord>,
  ) {}

  /**
   * GET /transactions — list transactions (paginated).
   * Maps to MAIN-PARA → STARTBR/READNEXT loop.
   */
  @Get()
  async listTransactions(
    @Session() _session: { commarea?: CardDemoCommarea },
    @Query('page') page = 1,
  ): Promise<TransactionListResponse> {
    const pageNum = Math.max(1, Number(page));
    const skip = (pageNum - 1) * this.pageSize;

    const transactions = await this.transactionRepo.find({
      order: { originTimestamp: 'DESC', transactionId: 'ASC' },
      skip,
      take: this.pageSize + 1,
    });

    const hasNextPage = transactions.length > this.pageSize;
    const items = transactions.slice(0, this.pageSize).map((t) =>
      this.toListItem(t),
    );

    this.logger.log(
      `${this.programName} [${this.transactionId}]: ` +
        `page=${pageNum} returned=${items.length}`,
    );

    return { pageNum, hasNextPage, transactions: items };
  }

  /**
   * GET /transactions/previous — previous page.
   * Maps to PROCESS-PF7-KEY.
   */
  @Get('previous')
  async previousPage(
    @Session() session: { commarea?: CardDemoCommarea },
    @Query('page') page = 2,
  ): Promise<TransactionListResponse> {
    // listTransactions clamps to ≥1 itself; just step back one page.
    return this.listTransactions(session, Number(page) - 1);
  }

  /**
   * POST /transactions/select — select a transaction.
   * Maps to PROCESS-TRAN-SELECT → XCTL to COTRN01C.
   */
  @Post('select')
  @HttpCode(HttpStatus.OK)
  selectTransaction(
    @Body() body: { tranId: string },
  ): { redirectTo: string; tranId: string } {
    return {
      redirectTo: 'transaction-view',
      tranId: body.tranId?.trim(),
    };
  }

  private toListItem(t: TransactionRecord): TransactionListItem {
    return {
      tranId: t.transactionId?.trimEnd() ?? '',
      tranTypeCd: t.typeCode?.trimEnd() ?? '',
      tranCatCd: Number(t.categoryCode ?? 0),
      tranSource: t.source?.trimEnd() ?? '',
      tranAmt: t.amount ?? '0.00',
      tranOrigTs: t.originTimestamp?.trimEnd() ?? '',
      tranCardNum: t.cardNumber?.trimEnd() ?? '',
    };
  }
}
