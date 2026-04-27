/**
 * Generated from CBEXPORT.cbl — CardDemo TypeScript migration
 * Original COBOL program: CBEXPORT — Export all entities to migration file.
 * Complexity: 1.65 (Easy).
 *   Reads five VSAM files (CUSTFILE, ACCTFILE, XREFFILE, TRANSACT, CARDFILE)
 *   sequentially and writes a multi-record export file keyed by sequence number.
 *   Each record type (C=Customer, A=Account, X=Xref, T=Transaction, K=Card)
 *   is prefixed with a 1-byte record type indicator per CVEXPORT copybook.
 *   Produces export statistics on completion.
 *   Business criticality: 2 — data migration utility, read-only source.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   0000-MAIN-PROCESSING      → run()
 *   1000-INITIALIZE           → initialize() / logging
 *   1050-GENERATE-TIMESTAMP   → generateTimestamp()
 *   2000-EXPORT-CUSTOMERS     → exportCustomers()
 *   3000-EXPORT-ACCOUNTS      → exportAccounts()
 *   4000-EXPORT-XREFS         → exportXrefs()
 *   5000-EXPORT-TRANSACTIONS  → exportTransactions()
 *   5500-EXPORT-CARDS         → exportCards()
 *   6000-FINALIZE             → finalize() / logging
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRecord } from '../entities/CustomerRecord';
import { AccountRecord } from '../entities/AccountRecord';
import { CardCrossReference } from '../entities/CardCrossReference';
import { TransactionRecord } from '../entities/TransactionRecord';
import { CardRecord } from '../entities/CardRecord';

/** Record type indicator bytes per CVEXPORT copybook */
export enum ExportRecordType {
  CUSTOMER = 'C',
  ACCOUNT = 'A',
  XREF = 'X',
  TRANSACTION = 'T',
  CARD = 'K',
}

export interface ExportRecord {
  /** EXPORT-SEQUENCE-NUM — PIC 9(09), auto-incremented */
  sequenceNum: number;
  /** 1-byte record type indicator */
  recordType: ExportRecordType;
  /** JSON payload — replaces fixed-length PIC X(500) binary layout */
  payload: Record<string, unknown>;
}

export interface ExportStatistics {
  exportDate: string;
  exportTime: string;
  customerRecordsExported: number;
  accountRecordsExported: number;
  xrefRecordsExported: number;
  transactionRecordsExported: number;
  cardRecordsExported: number;
  totalRecordsExported: number;
}

export interface DataExportResult {
  records: ExportRecord[];
  statistics: ExportStatistics;
}

/**
 * DataExportService — translates CBEXPORT batch program.
 *
 * Reads all entities from PostgreSQL and produces an ordered export record
 * stream. In the modernized architecture the "export file" is a
 * DataExportResult returned in-memory; callers stream it to S3, Kafka,
 * or a flat file writer as appropriate for the migration target.
 *
 * VSAM → PostgreSQL table mapping:
 *   CUSTFILE  → customer_records
 *   ACCTFILE  → account_records
 *   XREFFILE  → card_cross_references
 *   TRANSACT  → transaction_records
 *   CARDFILE  → card_records
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  /** WS-PGMNAME equivalent */
  private readonly programName = 'CBEXPORT';

  private sequenceCounter = 0;

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
   * run() — maps to 0000-MAIN-PROCESSING PERFORM chain.
   */
  async run(): Promise<DataExportResult> {
    this.sequenceCounter = 0;
    const records: ExportRecord[] = [];
    const stats: ExportStatistics = {
      exportDate: '',
      exportTime: '',
      customerRecordsExported: 0,
      accountRecordsExported: 0,
      xrefRecordsExported: 0,
      transactionRecordsExported: 0,
      cardRecordsExported: 0,
      totalRecordsExported: 0,
    };

    // 1000-INITIALIZE + 1050-GENERATE-TIMESTAMP
    const { exportDate, exportTime } = this.generateTimestamp();
    stats.exportDate = exportDate;
    stats.exportTime = exportTime;
    this.logger.log(`${this.programName}: Starting Customer Data Export`);
    this.logger.log(`${this.programName}: Export Date: ${exportDate}`);
    this.logger.log(`${this.programName}: Export Time: ${exportTime}`);

    // 2000-EXPORT-CUSTOMERS
    const customers = await this.exportCustomers();
    records.push(...customers);
    stats.customerRecordsExported = customers.length;

    // 3000-EXPORT-ACCOUNTS
    const accounts = await this.exportAccounts();
    records.push(...accounts);
    stats.accountRecordsExported = accounts.length;

    // 4000-EXPORT-XREFS
    const xrefs = await this.exportXrefs();
    records.push(...xrefs);
    stats.xrefRecordsExported = xrefs.length;

    // 5000-EXPORT-TRANSACTIONS
    const transactions = await this.exportTransactions();
    records.push(...transactions);
    stats.transactionRecordsExported = transactions.length;

    // 5500-EXPORT-CARDS
    const cards = await this.exportCards();
    records.push(...cards);
    stats.cardRecordsExported = cards.length;

    // 6000-FINALIZE
    stats.totalRecordsExported =
      stats.customerRecordsExported +
      stats.accountRecordsExported +
      stats.xrefRecordsExported +
      stats.transactionRecordsExported +
      stats.cardRecordsExported;

    this.logger.log(
      `${this.programName}: Export complete. ` +
        `Total records: ${stats.totalRecordsExported}`,
    );

    return { records, statistics: stats };
  }

  /**
   * 1050-GENERATE-TIMESTAMP
   * COBOL used ACCEPT … FROM DATE YYYYMMDD / FROM TIME.
   */
  private generateTimestamp(): { exportDate: string; exportTime: string } {
    const now = new Date();
    const exportDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const exportTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    return { exportDate, exportTime };
  }

  /** Next sequence number — WS-SEQUENCE-COUNTER COMPUTE +1 */
  private nextSeq(): number {
    return ++this.sequenceCounter;
  }

  /**
   * 2000-EXPORT-CUSTOMERS
   * PERFORM UNTIL WS-CUSTOMER-EOF
   */
  private async exportCustomers(): Promise<ExportRecord[]> {
    const rows = await this.customerRepo.find();
    return rows.map((c) => ({
      sequenceNum: this.nextSeq(),
      recordType: ExportRecordType.CUSTOMER,
      payload: {
        custId: c.customerId,
        firstName: c.firstName,
        middleName: c.middleName,
        lastName: c.lastName,
        streetAddress: c.addressLine1,
        addressLine2: c.addressLine2,
        addressLine3: c.addressLine3,
        stateCd: c.addressStateCode,
        zipCd: c.addressZip,
        countryCd: c.addressCountryCode,
        phone: c.phoneNumber1,
        phoneAlt: c.phoneNumber2,
        ssn: c.ssn,
        fico: c.ficoCreditScore,
        dob: c.dateOfBirth,
        eaddr: c.eftAccountId,
        primaryHolder: c.primaryCardHolderIndicator,
        govtIssuedId: c.govtIssuedId,
      },
    }));
  }

  /**
   * 3000-EXPORT-ACCOUNTS
   */
  private async exportAccounts(): Promise<ExportRecord[]> {
    const rows = await this.accountRepo.find();
    return rows.map((a) => ({
      sequenceNum: this.nextSeq(),
      recordType: ExportRecordType.ACCOUNT,
      payload: {
        acctId: a.accountId,
        activeStatus: a.activeStatus,
        currentBalance: a.currentBalance,
        creditLimit: a.creditLimit,
        cashCreditLimit: a.cashCreditLimit,
        openDate: a.openDate,
        expirationDate: a.expirationDate,
        reissueDate: a.reissueDate,
        currentCycleCredit: a.currentCycleCredit,
        currentCycleDebit: a.currentCycleDebit,
        groupId: a.groupId,
      },
    }));
  }

  /**
   * 4000-EXPORT-XREFS
   */
  private async exportXrefs(): Promise<ExportRecord[]> {
    const rows = await this.xrefRepo.find();
    return rows.map((x) => ({
      sequenceNum: this.nextSeq(),
      recordType: ExportRecordType.XREF,
      payload: {
        cardNum: x.cardNumber,
        custNum: x.customerId,
        acctId: x.accountId,
      },
    }));
  }

  /**
   * 5000-EXPORT-TRANSACTIONS
   */
  private async exportTransactions(): Promise<ExportRecord[]> {
    const rows = await this.transactionRepo.find();
    return rows.map((t) => ({
      sequenceNum: this.nextSeq(),
      recordType: ExportRecordType.TRANSACTION,
      payload: {
        tranId: t.transactionId,
        tranTypeCd: t.typeCode,
        tranCatCd: t.categoryCode,
        tranSource: t.source,
        tranDescription: t.description,
        tranAmt: t.amount,
        tranMerchantId: t.merchantId,
        tranMerchantName: t.merchantName,
        tranMerchantCity: t.merchantCity,
        tranMerchantZip: t.merchantZip,
        tranCardNum: t.cardNumber,
        tranOrigTs: t.originTimestamp,
        tranProcTs: t.processTimestamp,
      },
    }));
  }

  /**
   * 5500-EXPORT-CARDS
   */
  private async exportCards(): Promise<ExportRecord[]> {
    const rows = await this.cardRepo.find();
    return rows.map((k) => ({
      sequenceNum: this.nextSeq(),
      recordType: ExportRecordType.CARD,
      payload: {
        cardNum: k.cardNumber,
        cardAcctId: k.accountId,
        cardCvvCd: k.cvvCode,
        cardEmbossedName: k.embossedName,
        cardExpiryDate: k.expirationDate,
        cardActiveStatus: k.activeStatus,
      },
    }));
  }
}
