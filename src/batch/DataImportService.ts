/**
 * Generated from CBIMPORT.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBIMPORT — Import migration file to VSAM files.
 * Complexity: 1.75 (Easy).
 *   Reads multi-record export file (produced by CBEXPORT / DataExportService).
 *   Routes each record by type indicator (C/A/X/T/K) to the appropriate output
 *   file. Validates records and writes errors to an ERROR-OUTPUT file.
 *   Business criticality: 3 — data migration import; idempotent but consequential.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   0000-MAIN-PROCESSING       → run()
 *   1000-INITIALIZE            → initialize() / logging
 *   2000-PROCESS-EXPORT-FILE   → processRecords()
 *   2100-PROCESS-RECORD        → routeRecord()
 *   2110-PROCESS-CUSTOMER-REC  → importCustomer()
 *   2120-PROCESS-ACCOUNT-REC   → importAccount()
 *   2130-PROCESS-XREF-REC      → importXref()
 *   2140-PROCESS-TRAN-REC      → importTransaction()
 *   2150-PROCESS-CARD-REC      → importCard()
 *   2160-PROCESS-ERROR-REC     → handleUnknownType()
 *   3000-FINALIZE              → finalize() / logging
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRecord } from '../entities/CustomerRecord';
import { AccountRecord } from '../entities/AccountRecord';
import { CardCrossReference } from '../entities/CardCrossReference';
import { TransactionRecord } from '../entities/TransactionRecord';
import { CardRecord } from '../entities/CardRecord';
import {
  DataExportResult,
  ExportRecord,
  ExportRecordType,
} from './DataExportService';

export interface ImportError {
  sequenceNum: number;
  recordType: string;
  reason: string;
}

export interface ImportStatistics {
  importDate: string;
  importTime: string;
  totalRecordsRead: number;
  customerRecordsImported: number;
  accountRecordsImported: number;
  xrefRecordsImported: number;
  transactionRecordsImported: number;
  cardRecordsImported: number;
  errorRecordsWritten: number;
  unknownRecordTypeCount: number;
}

export interface DataImportResult {
  statistics: ImportStatistics;
  errors: ImportError[];
}

/**
 * DataImportService — translates CBIMPORT batch program.
 *
 * Consumes a DataExportResult (in-memory) and upserts each entity into
 * PostgreSQL using ON CONFLICT DO UPDATE semantics (replaces VSAM WRITE +
 * REWRITE logic). Error records are collected and returned for caller review.
 *
 * In production, hook this to a streaming ETL pipeline rather than loading the
 * full export into memory for large datasets.
 */
@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  private readonly programName = 'CBIMPORT';

  constructor(
    @InjectRepository(CustomerRecord)
    private readonly customerRepo: Repository<CustomerRecord>,
    @InjectRepository(AccountRecord)
    private readonly accountRepo: Repository<AccountRecord>,
    @InjectRepository(CardCrossReference)
    private readonly xrefRepo: Repository<CardCrossReference>,
    @InjectRepository(TransactionRecord)
    private readonly transactionRepo: Repository<TransactionRecord>,
    @InjectRepository(CardRecord)
    private readonly cardRepo: Repository<CardRecord>,
  ) {}

  /**
   * run() — maps to 0000-MAIN-PROCESSING.
   * @param exportData — output from DataExportService.run()
   */
  async run(exportData: DataExportResult): Promise<DataImportResult> {
    const stats: ImportStatistics = {
      importDate: '',
      importTime: '',
      totalRecordsRead: 0,
      customerRecordsImported: 0,
      accountRecordsImported: 0,
      xrefRecordsImported: 0,
      transactionRecordsImported: 0,
      cardRecordsImported: 0,
      errorRecordsWritten: 0,
      unknownRecordTypeCount: 0,
    };
    const errors: ImportError[] = [];

    // 1000-INITIALIZE
    const now = new Date();
    stats.importDate = now.toISOString().split('T')[0];
    stats.importTime = now.toTimeString().split(' ')[0];
    this.logger.log(`${this.programName}: Starting import`);
    this.logger.log(`${this.programName}: Import Date: ${stats.importDate}`);

    // 2000-PROCESS-EXPORT-FILE
    for (const record of exportData.records) {
      stats.totalRecordsRead++;

      try {
        // 2100-PROCESS-RECORD
        await this.routeRecord(record, stats);
      } catch (err) {
        // 2160-PROCESS-ERROR-REC
        const reason = err instanceof Error ? err.message : String(err);
        errors.push({ sequenceNum: record.sequenceNum, recordType: record.recordType, reason });
        stats.errorRecordsWritten++;
        this.logger.warn(
          `${this.programName}: Error on seq ${record.sequenceNum} ` +
            `type ${record.recordType}: ${reason}`,
        );
      }
    }

    // 3000-FINALIZE
    this.logger.log(
      `${this.programName}: Import complete. ` +
        `Read=${stats.totalRecordsRead} ` +
        `Customers=${stats.customerRecordsImported} ` +
        `Accounts=${stats.accountRecordsImported} ` +
        `Xrefs=${stats.xrefRecordsImported} ` +
        `Transactions=${stats.transactionRecordsImported} ` +
        `Cards=${stats.cardRecordsImported} ` +
        `Errors=${stats.errorRecordsWritten}`,
    );

    return { statistics: stats, errors };
  }

  /**
   * 2100-PROCESS-RECORD — dispatch by record type indicator.
   */
  private async routeRecord(
    record: ExportRecord,
    stats: ImportStatistics,
  ): Promise<void> {
    switch (record.recordType) {
      case ExportRecordType.CUSTOMER:
        await this.importCustomer(record);
        stats.customerRecordsImported++;
        break;

      case ExportRecordType.ACCOUNT:
        await this.importAccount(record);
        stats.accountRecordsImported++;
        break;

      case ExportRecordType.XREF:
        await this.importXref(record);
        stats.xrefRecordsImported++;
        break;

      case ExportRecordType.TRANSACTION:
        await this.importTransaction(record);
        stats.transactionRecordsImported++;
        break;

      case ExportRecordType.CARD:
        await this.importCard(record);
        stats.cardRecordsImported++;
        break;

      default:
        // 2160-PROCESS-ERROR-REC equivalent for unknown type
        stats.unknownRecordTypeCount++;
        throw new Error(`Unknown record type: ${record.recordType}`);
    }
  }

  /**
   * 2110-PROCESS-CUSTOMER-REC
   * COBOL: WRITE CUSTOMER-OUTPUT FROM WS-CUSTOMER-RECORD
   * Migration: upsert into customer_records table.
   */
  private async importCustomer(record: ExportRecord): Promise<void> {
    const p = record.payload as Record<string, unknown>;
    await this.customerRepo.upsert(
      this.customerRepo.create({
        custId: p['custId'] as string,
        firstName: p['firstName'] as string,
        middleName: p['middleName'] as string,
        lastName: p['lastName'] as string,
        streetAddress: p['streetAddress'] as string,
        city: p['city'] as string,
        stateCd: p['stateCd'] as string,
        zipCd: p['zipCd'] as string,
        countryCd: p['countryCd'] as string,
        phone: p['phone'] as string,
        creditScore: p['creditScore'] as number,
        creditScoreTs: p['creditScoreTs'] as string,
        fico: p['fico'] as number,
        dob: p['dob'] as string,
        eaddr: p['eaddr'] as string,
        govtIssuedId: p['govtIssuedId'] as string,
      }),
      ['custId'],
    );
  }

  /**
   * 2120-PROCESS-ACCOUNT-REC
   */
  private async importAccount(record: ExportRecord): Promise<void> {
    const p = record.payload as Record<string, unknown>;
    await this.accountRepo.upsert(
      this.accountRepo.create({
        acctId: p['acctId'] as string,
        activeStatus: p['activeStatus'] as string,
        currentBalance: p['currentBalance'] as string,
        creditLimit: p['creditLimit'] as string,
        cashCreditLimit: p['cashCreditLimit'] as string,
        openDate: p['openDate'] as string,
        expirationDate: p['expirationDate'] as string,
        reissueDate: p['reissueDate'] as string,
        currentCycleCredit: p['currentCycleCredit'] as string,
        currentCycleDebit: p['currentCycleDebit'] as string,
        groupId: p['groupId'] as string,
      }),
      ['acctId'],
    );
  }

  /**
   * 2130-PROCESS-XREF-REC
   */
  private async importXref(record: ExportRecord): Promise<void> {
    const p = record.payload as Record<string, unknown>;
    await this.xrefRepo.upsert(
      this.xrefRepo.create({
        cardNum: p['cardNum'] as string,
        custNum: p['custNum'] as string,
        acctId: p['acctId'] as string,
      }),
      ['cardNum'],
    );
  }

  /**
   * 2140-PROCESS-TRAN-REC
   */
  private async importTransaction(record: ExportRecord): Promise<void> {
    const p = record.payload as Record<string, unknown>;
    await this.transactionRepo.upsert(
      this.transactionRepo.create({
        tranId: p['tranId'] as string,
        tranTypeCd: p['tranTypeCd'] as string,
        tranCatCd: p['tranCatCd'] as number,
        tranSource: p['tranSource'] as string,
        tranDescription: p['tranDescription'] as string,
        tranAmt: p['tranAmt'] as string,
        tranMerchantId: p['tranMerchantId'] as number,
        tranMerchantName: p['tranMerchantName'] as string,
        tranMerchantCity: p['tranMerchantCity'] as string,
        tranMerchantZip: p['tranMerchantZip'] as string,
        tranCardNum: p['tranCardNum'] as string,
        tranOrigTs: p['tranOrigTs'] as string,
        tranProcTs: p['tranProcTs'] as string,
      }),
      ['tranId'],
    );
  }

  /**
   * 2150-PROCESS-CARD-REC
   */
  private async importCard(record: ExportRecord): Promise<void> {
    const p = record.payload as Record<string, unknown>;
    await this.cardRepo.upsert(
      this.cardRepo.create({
        cardNum: p['cardNum'] as string,
        cardAcctId: p['cardAcctId'] as string,
        cardCvvCd: p['cardCvvCd'] as string,
        cardEmbossedName: p['cardEmbossedName'] as string,
        cardExpiryDate: p['cardExpiryDate'] as string,
        cardActiveStatus: p['cardActiveStatus'] as string,
      }),
      ['cardNum'],
    );
  }
}
