/**
 * Generated from CBACT03C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBACT03C — Batch program that reads the CARDXREF VSAM KSDS
 *   sequentially and prints each cross-reference record. Complexity: 1.40 (Easy).
 *   Identical structure to CBACT02C but operates on the card cross-reference file,
 *   which maps card numbers → customer IDs → account IDs.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardCrossReference } from '../entities/CardCrossReference';

@Injectable()
export class CardXrefReader {
  private readonly logger = new Logger(CardXrefReader.name);

  private endOfFile = false;
  private recordCount = 0;

  constructor(
    @InjectRepository(CardCrossReference)
    private readonly xrefRepository: Repository<CardCrossReference>,
  ) {}

  /**
   * Main entry point — equivalent to COBOL PROCEDURE DIVISION.
   * COBOL: PERFORM 0000-XREFFILE-OPEN, loop GET-NEXT, PERFORM 9000-XREFFILE-CLOSE.
   */
  async run(): Promise<void> {
    this.logger.log('START OF EXECUTION OF PROGRAM CBACT03C');

    await this.openXrefFile();

    try {
      await this.processAllXrefs();
    } finally {
      await this.closeXrefFile();
    }

    this.logger.log(`END OF EXECUTION OF PROGRAM CBACT03C — ${this.recordCount} records read`);
  }

  /**
   * 0000-XREFFILE-OPEN
   */
  private async openXrefFile(): Promise<void> {
    try {
      await this.xrefRepository.count();
      this.logger.debug('XREF file opened successfully');
    } catch (err) {
      this.logger.error('ERROR OPENING XREFFILE', err);
      throw new Error('ABEND: Cannot open XREFFILE');
    }
  }

  /**
   * Sequential read loop — PERFORM UNTIL END-OF-FILE.
   */
  private async processAllXrefs(): Promise<void> {
    const stream = await this.xrefRepository.createQueryBuilder('xref').stream();

    try {
      for await (const record of stream as AsyncIterable<CardCrossReference>) {
        this.displayXrefRecord(record);
        this.recordCount++;
      }
      this.endOfFile = true;
    } catch (err) {
      this.logger.error('ERROR READING XREFFILE', err);
      throw new Error('ABEND: Read error on XREFFILE');
    }
  }

  /**
   * 1000-XREFFILE-GET-NEXT — display xref record.
   * COBOL: DISPLAY CARD-XREF-RECORD
   */
  private displayXrefRecord(xref: CardCrossReference): void {
    this.logger.log(
      `XREF: CARD=${xref.cardNumber} CUST=${xref.customerId} ACCT=${xref.accountId}`,
    );
  }

  /**
   * 9000-XREFFILE-CLOSE
   */
  private async closeXrefFile(): Promise<void> {
    this.logger.debug('XREF file closed');
  }
}
