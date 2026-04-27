/**
 * Generated from CORPT00C.cbl — CardDemo TypeScript migration
 * Original COBOL program: Transaction reports — date-range selection screen.
 * Complexity: 2.35 (Moderate).
 *   Transaction ID: CRPT. Presents a date-range input form (start date / end date).
 *   On ENTER, validates dates and XCTLs to the batch report generator (CBTRN03C).
 *   PF3 returns to main menu. No direct file reads — this is a front-end routing
 *   program that collects parameters and dispatches to the batch reporting layer.
 *   Business criticality: 1 — read-only parameter collection.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → getReportOptions()
 *   PROCESS-ENTER-KEY     → generateReport()
 *   EDIT-DATE-INPUTS      → validateDateRange()
 *   SEND-RPTSEL-SCREEN    → ReportOptionsResponse
 *   XCTL TO CBTRN03C      → delegate to TransactionReportService
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TransactionRecord } from '../entities/TransactionRecord';
import { Decimal, addDecimal, decimalToString, toDecimal } from '../utils/decimal';
import { toCardDemoTimestamp } from '../utils/cobol-date';

export interface ReportOptionsResponse {
  message: string;
  availableReports: string[];
}

export interface TransactionReportRequest {
  /** Start date — YYYY-MM-DD, mirrors CDEMO-START-DATE (PIC X(10)) */
  startDate: string;
  /** End date — YYYY-MM-DD, mirrors CDEMO-END-DATE (PIC X(10)) */
  endDate: string;
  /** Optional account ID filter — PIC 9(11) */
  accountId?: string;
}

export interface TransactionReportRow {
  transactionId: string;
  accountId?: string;
  tranTypeCd: string;
  tranCatCd: number;
  tranSource: string;
  tranAmt: string;
  tranOrigTs: string;
  merchantName: string;
  merchantCity: string;
}

export interface TransactionReportResponse {
  startDate: string;
  endDate: string;
  totalRecords: number;
  grandTotal: string;
  rows: TransactionReportRow[];
}

/** ISO date pattern — mirrors COBOL YYYY-MM-DD validation */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Controller('reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    @InjectRepository(TransactionRecord)
    private readonly transactionRepository: Repository<TransactionRecord>,
  ) {}

  /**
   * Return available report options — analogous to SEND-RPTSEL-SCREEN.
   * In COBOL this simply displayed the date-entry form.
   */
  @Get()
  getReportOptions(): ReportOptionsResponse {
    return {
      message:
        'Enter a start date and end date to generate a transaction report.',
      availableReports: ['daily-transaction'],
    };
  }

  /**
   * Generate a transaction report for the given date range.
   *
   * COBOL equivalent: PROCESS-ENTER-KEY → validate dates → XCTL CBTRN03C
   * In COBOL, CBTRN03C read TRANSACT sequentially and produced a line-printer
   * report. Here we return a JSON payload; rendering is left to the client.
   *
   * Date comparison mirrors COBOL: TRAN-ORIG-TS (PIC X(26)) starts with
   * YYYY-MM-DD, so a string prefix comparison is equivalent.
   */
  @Post('daily-transaction')
  async generateReport(
    @Body() req: TransactionReportRequest,
  ): Promise<TransactionReportResponse> {
    this.validateDateRange(req.startDate, req.endDate);

    // TRAN-ORIG-TS is stored as 'YYYY-MM-DD HH:MM:SS.MMMMMM' (see toCardDemoTimestamp).
    // Use string boundaries that match that format so Between works as a string range.
    const startTs = toCardDemoTimestamp(new Date(`${req.startDate}T00:00:00.000Z`));
    const endTs = toCardDemoTimestamp(new Date(`${req.endDate}T23:59:59.999Z`));

    const where: Record<string, unknown> = {
      originTimestamp: Between(startTs, endTs),
    };

    const transactions = await this.transactionRepository.find({
      where,
      order: { originTimestamp: 'ASC' },
    });

    // PIC S9(09)V99 — must be summed as fixed-point Decimal, not float.
    const grandTotal = decimalToString(
      transactions.reduce(
        (sum, t) => addDecimal(sum, toDecimal(t.amount)),
        new Decimal(0),
      ),
    );

    this.logger.log(
      `Report generated: start=${req.startDate} end=${req.endDate} rows=${transactions.length}`,
    );

    const rows: TransactionReportRow[] = transactions.map((t) => ({
      transactionId: t.transactionId,
      tranTypeCd: t.typeCode,
      tranCatCd: t.categoryCode,
      tranSource: t.source,
      tranAmt: t.amount,
      tranOrigTs: t.originTimestamp,
      merchantName: t.merchantName,
      merchantCity: t.merchantCity,
    }));

    return {
      startDate: req.startDate,
      endDate: req.endDate,
      totalRecords: transactions.length,
      grandTotal,
      rows,
    };
  }

  /** Mirrors COBOL EDIT-DATE-INPUTS paragraph — validate YYYY-MM-DD format and range logic */
  private validateDateRange(startDate: string, endDate: string): void {
    if (!DATE_PATTERN.test(startDate)) {
      throw new BadRequestException(
        `startDate must be in YYYY-MM-DD format (got: ${startDate})`,
      );
    }
    if (!DATE_PATTERN.test(endDate)) {
      throw new BadRequestException(
        `endDate must be in YYYY-MM-DD format (got: ${endDate})`,
      );
    }
    if (startDate > endDate) {
      throw new BadRequestException(
        `startDate (${startDate}) must be on or before endDate (${endDate})`,
      );
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) {
      throw new BadRequestException(`startDate is not a valid calendar date: ${startDate}`);
    }
    if (isNaN(end.getTime())) {
      throw new BadRequestException(`endDate is not a valid calendar date: ${endDate}`);
    }
  }
}
