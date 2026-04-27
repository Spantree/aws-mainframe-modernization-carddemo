/**
 * CardDemo TypeScript migration — root NestJS application module.
 *
 * Wires every TypeORM entity into the DataSource and registers all controllers
 * and batch services translated from the original COBOL program set.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities (per copybook)
import { AccountRecord } from './entities/AccountRecord';
import { CardRecord } from './entities/CardRecord';
import { CardCrossReference } from './entities/CardCrossReference';
import { CustomerRecord } from './entities/CustomerRecord';
import { DailyTransactionRecord } from './entities/DailyTransactionRecord';
import { DisclosureGroup } from './entities/DisclosureGroup';
import { TransactionCategory } from './entities/TransactionCategory';
import { TransactionCategoryBalance } from './entities/TransactionCategoryBalance';
import { TransactionRecord } from './entities/TransactionRecord';
import { TransactionType } from './entities/TransactionType';
import { UserSecurityRecord } from './entities/UserSecurityRecord';

// Online controllers
import { AccountListController } from './online/AccountListController';
import { AccountUpdateController } from './online/AccountUpdateController';
import { AccountViewController } from './online/AccountViewController';
import { AdminMenuController } from './online/AdminMenuController';
import { AuthorizationController } from './online/AuthorizationController';
import { BillingController } from './online/BillingController';
import { CardListComplexController } from './online/CardListComplexController';
import { CardListController } from './online/CardListController';
import { CardUpdateController } from './online/CardUpdateController';
import { DateUtilController } from './online/DateUtilController';
import {
  CardSearchController,
  TransactionSearchController,
} from './online/HighComplexityStubs';
import { ReportController } from './online/ReportController';
import { SignOnController } from './online/SignOnController';
import { TransactionListComplexController } from './online/TransactionListComplexController';
import { TransactionListController } from './online/TransactionListController';
import { TransactionUpdateController } from './online/TransactionUpdateController';
import { TransactionViewController } from './online/TransactionViewController';
import { UserAddController } from './online/UserAddController';
import { UserDeleteController } from './online/UserDeleteController';
import { UserListController } from './online/UserListController';
import { UserMenuController } from './online/UserMenuController';
import { UserViewController } from './online/UserViewController';

// Batch services
import { AccountFileReader } from './batch/AccountFileReader';
import { CardFileReader } from './batch/CardFileReader';
import { CardXrefReader } from './batch/CardXrefReader';
import { CustomerFileReader } from './batch/CustomerFileReader';
import { DataExportService } from './batch/DataExportService';
import { DataImportService } from './batch/DataImportService';
import { DateValidationService } from './batch/DateValidationService';
import { InterestCalculator } from './batch/InterestCalculator';
import { StatementGeneratorService } from './batch/StatementGeneratorService';
import { TransactionPostingService } from './batch/TransactionPostingService';
import { TransactionReportService } from './batch/TransactionReportService';
import { WaitUtility } from './batch/WaitUtility';

const ENTITIES = [
  AccountRecord,
  CardRecord,
  CardCrossReference,
  CustomerRecord,
  DailyTransactionRecord,
  DisclosureGroup,
  TransactionCategory,
  TransactionCategoryBalance,
  TransactionRecord,
  TransactionType,
  UserSecurityRecord,
];

const CONTROLLERS = [
  AccountListController,
  AccountUpdateController,
  AccountViewController,
  AdminMenuController,
  AuthorizationController,
  BillingController,
  CardListComplexController,
  CardListController,
  CardSearchController,
  CardUpdateController,
  DateUtilController,
  ReportController,
  SignOnController,
  TransactionListComplexController,
  TransactionListController,
  TransactionSearchController,
  TransactionUpdateController,
  TransactionViewController,
  UserAddController,
  UserDeleteController,
  UserListController,
  UserMenuController,
  UserViewController,
];

const BATCH_SERVICES = [
  AccountFileReader,
  CardFileReader,
  CardXrefReader,
  CustomerFileReader,
  DataExportService,
  DataImportService,
  DateValidationService,
  InterestCalculator,
  StatementGeneratorService,
  TransactionPostingService,
  TransactionReportService,
  WaitUtility,
];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PGHOST ?? 'localhost',
      port: Number.parseInt(process.env.PGPORT ?? '5432', 10),
      username: process.env.PGUSER ?? 'carddemo',
      password: process.env.PGPASSWORD ?? 'carddemo',
      database: process.env.PGDATABASE ?? 'carddemo',
      entities: ENTITIES,
      synchronize: false,
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: CONTROLLERS,
  providers: BATCH_SERVICES,
})
export class AppModule {}
