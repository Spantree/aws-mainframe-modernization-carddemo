/**
 * Generated from COTRN01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COTRN01C — Transaction view (single record display).
 * Complexity: 1.65 (Easy).
 *   Transaction ID: CT01. Displays one transaction from TRANSACT by TRAN-ID.
 *   Read-only. XCTL source: COTRN00C (list selection).
 *   Business criticality: 2 — read-only display.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA              → getTransaction()
 *   READ-TRANSACT-FILE     → transactionRepo.findOneBy()
 *   SEND-TRAN-DETAIL       → TransactionDetailResponse
 */

import {
  Controller,
  Get,
  Param,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionRecord } from '../entities/TransactionRecord';

export interface TransactionDetailResponse {
  tranId: string;
  tranTypeCd: string;
  tranCatCd: number;
  tranSource: string;
  tranDescription: string;
  tranAmt: string;
  tranMerchantId: number;
  tranMerchantName: string;
  tranMerchantCity: string;
  tranMerchantZip: string;
  tranCardNum: string;
  tranOrigTs: string;
  tranProcTs: string;
}

/**
 * TransactionViewController — translates COTRN01C.
 * Transaction ID: CT01
 */
@Controller('transactions')
export class TransactionViewController {
  private readonly logger = new Logger(TransactionViewController.name);

  private readonly programName = 'COTRN01C';
  private readonly transactionId = 'CT01';

  constructor(
    @InjectRepository(TransactionRecord)
    private readonly transactionRepo: Repository<TransactionRecord>,
  ) {}

  /**
   * GET /transactions/:tranId — view transaction detail.
   * Maps to MAIN-PARA → READ-TRANSACT-FILE → SEND-TRAN-DETAIL.
   */
  @Get(':tranId')
  async getTransaction(
    @Param('tranId') tranId: string,
  ): Promise<TransactionDetailResponse> {
    // READ-TRANSACT-FILE — EXEC CICS READ FILE('TRANSACT') INTO(tran-record)
    const tran = await this.transactionRepo.findOneBy({
      transactionId: tranId.padEnd(16).substring(0, 16),
    });

    if (!tran) {
      this.logger.warn(
        `${this.programName} [${this.transactionId}]: ` +
          `transaction not found: ${tranId}`,
      );
      throw new NotFoundException(`Transaction not found: ${tranId}`);
    }

    this.logger.log(
      `${this.programName} [${this.transactionId}]: displaying ${tranId}`,
    );

    return {
      tranId: tran.transactionId?.trimEnd() ?? '',
      tranTypeCd: tran.typeCode?.trimEnd() ?? '',
      tranCatCd: Number(tran.categoryCode ?? 0),
      tranSource: tran.source?.trimEnd() ?? '',
      tranDescription: tran.description?.trimEnd() ?? '',
      tranAmt: tran.amount ?? '0.00',
      tranMerchantId: Number(tran.merchantId ?? 0),
      tranMerchantName: tran.merchantName?.trimEnd() ?? '',
      tranMerchantCity: tran.merchantCity?.trimEnd() ?? '',
      tranMerchantZip: tran.merchantZip?.trimEnd() ?? '',
      tranCardNum: tran.cardNumber?.trimEnd() ?? '',
      tranOrigTs: tran.originTimestamp?.trimEnd() ?? '',
      tranProcTs: tran.processTimestamp?.trimEnd() ?? '',
    };
  }
}
