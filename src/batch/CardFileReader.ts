/**
 * Generated from CBACT02C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBACT02C — Batch program that reads the CARDFILE VSAM KSDS
 *   sequentially and prints each card record. Complexity: 1.40 (Easy).
 *   Paragraphs: 0000-CARDFILE-OPEN, 1000-CARDFILE-GET-NEXT, 9000-CARDFILE-CLOSE,
 *   9910-DISPLAY-IO-STATUS, 9999-ABEND-PROGRAM.
 *   The COBOL program performed sequential VSAM reads in a PERFORM UNTIL END-OF-FILE loop.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardRecord } from '../entities/CardRecord';

// Repository interface — abstracting away the actual data source
// (VSAM in COBOL; PostgreSQL cursor / stream in migration)
export interface ICardFileRepository {
  findAll(): AsyncIterable<CardRecord>;
}

@Injectable()
export class CardFileReader {
  private readonly logger = new Logger(CardFileReader.name);

  // Working-storage equivalents:
  // END-OF-FILE PIC X(01) → endOfFile boolean
  // APPL-RESULT PIC S9(9) → numeric result code
  private endOfFile = false;
  private recordCount = 0;

  constructor(
    @InjectRepository(CardRecord)
    private readonly cardRepository: Repository<CardRecord>,
  ) {}

  /**
   * Main entry point — equivalent to COBOL PROCEDURE DIVISION.
   * COBOL flow:
   *   PERFORM 0000-CARDFILE-OPEN
   *   PERFORM UNTIL END-OF-FILE = 'Y'
   *     PERFORM 1000-CARDFILE-GET-NEXT
   *     DISPLAY CARD-RECORD
   *   END-PERFORM
   *   PERFORM 9000-CARDFILE-CLOSE
   *   GOBACK
   */
  async run(): Promise<void> {
    this.logger.log('START OF EXECUTION OF PROGRAM CBACT02C');

    await this.openCardFile();

    try {
      await this.processAllCards();
    } finally {
      await this.closeCardFile();
    }

    this.logger.log(`END OF EXECUTION OF PROGRAM CBACT02C — ${this.recordCount} records read`);
  }

  /**
   * 0000-CARDFILE-OPEN — open CARDFILE for sequential read.
   * In COBOL this opened the VSAM KSDS. Here we verify DB connectivity.
   */
  private async openCardFile(): Promise<void> {
    try {
      // Verify connection is available (replaces OPEN INPUT CARDFILE-FILE)
      await this.cardRepository.count();
      this.logger.debug('Card file opened successfully');
    } catch (err) {
      this.logger.error('ERROR OPENING CARDFILE', err);
      throw new Error('ABEND: Cannot open CARDFILE');
    }
  }

  /**
   * Main sequential read loop — PERFORM UNTIL END-OF-FILE.
   * In COBOL this was a tight loop with READ CARDFILE-FILE INTO CARD-RECORD.
   * Here we stream results from PostgreSQL using a cursor (TypeORM QueryBuilder stream).
   */
  private async processAllCards(): Promise<void> {
    const stream = await this.cardRepository.createQueryBuilder('card').stream();

    try {
      for await (const record of stream as AsyncIterable<CardRecord>) {
        // 1000-CARDFILE-GET-NEXT equivalent: receive record, display it
        this.displayCardRecord(record);
        this.recordCount++;
      }
      this.endOfFile = true;
    } catch (err) {
      this.logger.error('ERROR READING CARDFILE', err);
      throw new Error('ABEND: Read error on CARDFILE');
    }
  }

  /**
   * 1000-CARDFILE-GET-NEXT — display card record.
   * In COBOL: DISPLAY CARD-RECORD (formatted dump of all fields).
   */
  private displayCardRecord(card: CardRecord): void {
    // Equivalent to DISPLAY CARD-RECORD in COBOL
    this.logger.log(
      `CARD: ${card.cardNumber} ACCT: ${card.accountId} ` +
        `NAME: ${card.embossedName.trim()} EXP: ${card.expirationDate} ` +
        `STATUS: ${card.activeStatus}`,
    );
  }

  /**
   * 9000-CARDFILE-CLOSE — close CARDFILE.
   * In COBOL: CLOSE CARDFILE-FILE. No-op here since TypeORM manages connections.
   */
  private async closeCardFile(): Promise<void> {
    this.logger.debug('Card file closed');
  }
}
