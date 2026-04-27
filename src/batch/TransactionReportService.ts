/**
 * Generated from CBTRN01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBTRN01C — Daily transaction report batch program. Complexity: 1.55 (Easy).
 *   Read-only report: reads DALYTRAN sequentially, validates each transaction by
 *   cross-referencing CUSTOMER, XREF, CARD, ACCOUNT, and TRANSACT files,
 *   and prints a formatted report with per-page, per-account, and grand totals.
 *   This program does NOT modify data — it only reads and reports.
 *   Business criticality: 2 (low). No ACID concerns; read-only.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { toDecimal, formatCurrency } from '../utils/decimal';
import { DailyTransactionRecord } from '../entities/DailyTransactionRecord';
import { CustomerRecord } from '../entities/CustomerRecord';
import { CardCrossReference } from '../entities/CardCrossReference';
import { CardRecord } from '../entities/CardRecord';
import { AccountRecord } from '../entities/AccountRecord';
import { TransactionRecord } from '../entities/TransactionRecord';

/** A single line in the transaction detail report */
export interface TransactionReportLine {
  transactionId: string;
  accountId: string;
  typeCode: string;
  categoryCode: number;
  source: string;
  amount: string; // formatted currency string
  isValid: boolean;
  validationMessage?: string;
}

/** Full report output structure */
export interface TransactionReport {
  lines: TransactionReportLine[];
  grandTotal: string;
  totalTransactions: number;
  rejectedCount: number;
}

@Injectable()
export class TransactionReportService {
  private readonly logger = new Logger(TransactionReportService.name);

  constructor(
    @InjectRepository(DailyTransactionRecord)
    private readonly dalytranRepository: Repository<DailyTransactionRecord>,

    @InjectRepository(CustomerRecord)
    private readonly customerRepository: Repository<CustomerRecord>,

    @InjectRepository(CardCrossReference)
    private readonly xrefRepository: Repository<CardCrossReference>,

    @InjectRepository(CardRecord)
    private readonly cardRepository: Repository<CardRecord>,

    @InjectRepository(AccountRecord)
    private readonly accountRepository: Repository<AccountRecord>,

    @InjectRepository(TransactionRecord)
    private readonly transactionRepository: Repository<TransactionRecord>,
  ) {}

  /**
   * Main entry point — equivalent to COBOL PROCEDURE DIVISION.
   * COBOL flow:
   *   Open all 6 files
   *   PERFORM UNTIL END-OF-FILE
   *     PERFORM 1000-DALYTRAN-GET-NEXT
   *     PERFORM 1100-VALIDATE-TRANSACTION
   *     PERFORM 1200-WRITE-REPORT-LINE
   *     ACCUMULATE totals (page, account, grand)
   *   Print totals
   *   GOBACK
   */
  async generateReport(): Promise<TransactionReport> {
    this.logger.log('START OF EXECUTION OF PROGRAM CBTRN01C');

    const report: TransactionReport = {
      lines: [],
      grandTotal: '0.00',
      totalTransactions: 0,
      rejectedCount: 0,
    };

    let grandTotal = new Decimal(0);

    // 1000-DALYTRAN-GET-NEXT: stream DALYTRAN sequentially
    const transactions = await this.dalytranRepository.find({
      order: { transactionId: 'ASC' },
    });

    for (const dalytran of transactions) {
      report.totalTransactions++;

      // 1100-VALIDATE-TRANSACTION: cross-check all reference files
      const validationResult = await this.validateTransaction(dalytran);

      const amount = toDecimal(dalytran.amount);

      // 1200-WRITE-REPORT-LINE: accumulate line
      const line: TransactionReportLine = {
        transactionId: dalytran.transactionId,
        accountId: validationResult.accountId ?? 'UNKNOWN',
        typeCode: dalytran.typeCode,
        categoryCode: dalytran.categoryCode,
        source: dalytran.source,
        amount: formatCurrency(amount),
        isValid: validationResult.isValid,
        validationMessage: validationResult.message,
      };

      report.lines.push(line);

      if (validationResult.isValid) {
        grandTotal = grandTotal.plus(amount);
      } else {
        report.rejectedCount++;
      }
    }

    report.grandTotal = formatCurrency(grandTotal);

    this.logger.log(
      `END OF EXECUTION OF PROGRAM CBTRN01C — ` +
        `Total: ${report.totalTransactions}, Valid: ${report.totalTransactions - report.rejectedCount}, ` +
        `Rejected: ${report.rejectedCount}, Grand Total: ${report.grandTotal}`,
    );

    return report;
  }

  /**
   * 1100-VALIDATE-TRANSACTION.
   * COBOL validated: card exists in CARDFILE, card-xref exists, customer exists,
   * account exists and is active, card account matches xref account.
   */
  private async validateTransaction(
    tran: DailyTransactionRecord,
  ): Promise<{ isValid: boolean; accountId?: string; message?: string }> {
    // Check card exists
    const card = await this.cardRepository.findOne({ where: { cardNumber: tran.cardNumber } });
    if (!card) {
      return { isValid: false, message: `Card ${tran.cardNumber} not found` };
    }

    if (card.activeStatus !== 'Y') {
      return { isValid: false, message: `Card ${tran.cardNumber} is not active` };
    }

    // Check xref exists
    const xref = await this.xrefRepository.findOne({ where: { cardNumber: tran.cardNumber } });
    if (!xref) {
      return { isValid: false, message: `No xref for card ${tran.cardNumber}` };
    }

    // Check customer exists
    const customer = await this.customerRepository.findOne({
      where: { customerId: xref.customerId },
    });
    if (!customer) {
      return { isValid: false, message: `Customer ${xref.customerId} not found` };
    }

    // Check account exists and is active
    const account = await this.accountRepository.findOne({
      where: { accountId: xref.accountId.toString() },
    });
    if (!account) {
      return { isValid: false, message: `Account ${xref.accountId} not found` };
    }
    if (account.activeStatus !== 'Y') {
      return { isValid: false, message: `Account ${xref.accountId} is not active` };
    }

    return { isValid: true, accountId: xref.accountId.toString() };
  }
}
