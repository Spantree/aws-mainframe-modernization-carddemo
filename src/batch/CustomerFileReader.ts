/**
 * Generated from CBCUS01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBCUS01C — Batch program that reads CUSTFILE VSAM KSDS
 *   sequentially and prints each customer record. Complexity: 1.40 (Easy).
 *   Same structure as CBACT02C/CBACT03C: open → sequential read loop → close.
 *   CUSTFILE is an indexed (KSDS) file keyed on CUST-ID (PIC 9(09)).
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRecord } from '../entities/CustomerRecord';

@Injectable()
export class CustomerFileReader {
  private readonly logger = new Logger(CustomerFileReader.name);

  private endOfFile = false;
  private recordCount = 0;

  constructor(
    @InjectRepository(CustomerRecord)
    private readonly customerRepository: Repository<CustomerRecord>,
  ) {}

  /**
   * Main entry point — equivalent to COBOL PROCEDURE DIVISION.
   * COBOL: PERFORM 0000-CUSTFILE-OPEN
   *        PERFORM UNTIL END-OF-FILE = 'Y'
   *          PERFORM 1000-CUSTFILE-GET-NEXT
   *          DISPLAY CUSTOMER-RECORD
   *        PERFORM 9000-CUSTFILE-CLOSE
   *        GOBACK
   */
  async run(): Promise<void> {
    this.logger.log('START OF EXECUTION OF PROGRAM CBCUS01C');

    await this.openCustomerFile();

    try {
      await this.processAllCustomers();
    } finally {
      await this.closeCustomerFile();
    }

    this.logger.log(
      `END OF EXECUTION OF PROGRAM CBCUS01C — ${this.recordCount} records read`,
    );
  }

  /**
   * 0000-CUSTFILE-OPEN
   */
  private async openCustomerFile(): Promise<void> {
    try {
      await this.customerRepository.count();
      this.logger.debug('Customer file opened successfully');
    } catch (err) {
      this.logger.error('ERROR OPENING CUSTFILE', err);
      throw new Error('ABEND: Cannot open CUSTFILE');
    }
  }

  /**
   * Sequential read loop.
   */
  private async processAllCustomers(): Promise<void> {
    const qb = this.customerRepository.createQueryBuilder('cust').stream();

    await new Promise<void>((resolve, reject) => {
      qb.then((stream) => {
        stream.on('data', (record: CustomerRecord) => {
          this.displayCustomerRecord(record);
          this.recordCount++;
        });
        stream.on('end', () => {
          this.endOfFile = true;
          resolve();
        });
        stream.on('error', (err) => {
          this.logger.error('ERROR READING CUSTOMER FILE', err);
          reject(new Error('ABEND: Read error on CUSTFILE'));
        });
      });
    });
  }

  /**
   * 1000-CUSTFILE-GET-NEXT — display customer record.
   */
  private displayCustomerRecord(cust: CustomerRecord): void {
    this.logger.log(
      `CUST: ${cust.customerId} ` +
        `${cust.firstName.trim()} ${cust.lastName.trim()} ` +
        `ZIP: ${cust.addressZip} FICO: ${cust.ficoCreditScore}`,
    );
  }

  /**
   * 9000-CUSTFILE-CLOSE
   */
  private async closeCustomerFile(): Promise<void> {
    this.logger.debug('Customer file closed');
  }
}
