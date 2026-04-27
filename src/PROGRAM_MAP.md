# CardDemo COBOL → TypeScript Program Map

Generated as part of the AI-assisted migration analysis.
See `migration-analysis/` for full complexity scores and methodology.

## Batch Programs

| COBOL File | TypeScript File | Complexity | Status |
|---|---|---|---|
| CBACT01C.cbl | batch/AccountFileReader.ts | 1.6 | ✅ Complete |
| CBACT02C.cbl | batch/CardFileReader.ts | 1.3 | ✅ Complete |
| CBACT03C.cbl | batch/CardXrefReader.ts | 1.3 | ✅ Complete |
| CBACT04C.cbl | batch/AccountFileReader.ts | 1.6 | ✅ Complete |
| CBCUS01C.cbl | batch/CustomerFileReader.ts | 1.3 | ✅ Complete |
| CBEXPORT.cbl | batch/DataExportService.ts | 1.45 | ✅ Complete |
| CBIMPORT.cbl | batch/DataImportService.ts | 1.45 | ✅ Complete |
| CBSTM03A.cbl | batch/StatementGeneratorService.ts | 2.25 | ✅ Complete |
| CBSTM03B.cbl | batch/StatementGeneratorService.ts | 1.4 | ✅ Complete |
| CBTRN01C.cbl | batch/TransactionPostingService.ts | 1.6 | ✅ Complete |
| CBTRN02C.cbl | batch/TransactionPostingService.ts | 1.6 | ✅ Complete |
| CBTRN03C.cbl | batch/TransactionPostingService.ts | 1.6 | ✅ Complete |
| COBSWAIT.cbl | batch/WaitUtility.ts | 1.15 | ✅ Complete |
| COBTUPDT.cbl | batch/TransactionReportService.ts | 1.4 | ✅ Complete |
| CSUTLDTC.cbl | batch/DateValidationService.ts | 1.5 | ✅ Complete |
| CBPAUP0C.cbl | batch/AccountFileReader.ts | 1.35 | ✅ Complete |
| DBUNLDGS.cbl | batch/DataExportService.ts | — | ⚠️ Variant — covered by DataExportService |
| PAUDBLOD.cbl | batch/DataImportService.ts | — | ⚠️ Variant — covered by DataImportService |
| CBSTM03B.cbl | batch/StatementGeneratorService.ts | 1.4 | ✅ Complete |

## Online / CICS Programs

| COBOL File | TypeScript File | Complexity | Status |
|---|---|---|---|
| COADM01C.cbl | online/AdminMenuController.ts | 1.75 | ✅ Complete |
| COACCT01.cbl | online/AccountListController.ts | 2.55 | ✅ Complete |
| COACTVWC.cbl | online/AccountViewController.ts | 2.8 | ✅ Complete |
| COACTUPC.cbl | online/AccountUpdateController.ts | 4.1 | 🔴 Stub — human specialist required |
| COBIL00C.cbl | online/BillingController.ts | 2.95 | ✅ Complete |
| COCRDLIC.cbl | online/HighComplexityStubs.ts | 3.85 | 🔴 Stub — human specialist required |
| COCRDSLC.cbl | online/CardListController.ts | 2.95 | ✅ Complete |
| COCRDUPC.cbl | online/CardUpdateController.ts | 3.35 | ✅ Complete |
| CODATE01.cbl | online/DateUtilController.ts | 2.3 | ✅ Complete |
| COMEN01C.cbl | online/UserMenuController.ts | 1.9 | ✅ Complete |
| COPAUA0C.cbl | online/AuthorizationController.ts | 2.8 | ⚠️ Stub |
| COPAUS0C.cbl | online/AuthorizationController.ts | 2.65 | ⚠️ Stub |
| COPAUS1C.cbl | online/AuthorizationController.ts | 2.15 | ⚠️ Stub |
| COPAUS2C.cbl | online/AuthorizationController.ts | 1.8 | ⚠️ Stub |
| CORPT00C.cbl | online/ReportController.ts | 2.35 | ✅ Complete |
| COSGN00C.cbl | online/SignOnController.ts | 2.15 | ✅ Complete |
| COTRN00C.cbl | online/TransactionListController.ts | 2.75 | ✅ Complete |
| COTRN01C.cbl | online/TransactionViewController.ts | 2.15 | ✅ Complete |
| COTRN02C.cbl | online/TransactionViewController.ts | 3.1 | ✅ Complete |
| COTRTLIC.cbl | online/HighComplexityStubs.ts | 3.6 | 🔴 Stub — human specialist required |
| COTRTUPC.cbl | online/HighComplexityStubs.ts | 3.3 | 🔴 Stub — specialist review recommended |
| COUSR00C.cbl | online/UserListController.ts | 2.8 | ✅ Complete |
| COUSR01C.cbl | online/UserAddController.ts | 2.1 | ✅ Complete |
| COUSR02C.cbl | online/UserViewController.ts | 2.45 | ✅ Complete |
| COUSR03C.cbl | online/UserDeleteController.ts | 2.25 | ✅ Complete |

## Summary

| Status | Count |
|---|---|
| ✅ Complete | 34 |
| ⚠️ Stub (ready to implement) | 4 |
| 🔴 Stub (human specialist required) | 4 |
| **Total** | **44** |

## Entities (from Copybooks)

| COBOL File | TypeScript File | Notes |
|---|---|---|
| CVACT01Y.cpy | entities/AccountRecord.ts | Account entity |
| CVACT02Y.cpy | entities/CardRecord.ts | Card entity |
| CVACT03Y.cpy | entities/CardCrossReference.ts | Card-account xref |
| CUSTREC.cpy | entities/CustomerRecord.ts | Customer entity |
| CVTRA05Y.cpy | entities/TransactionRecord.ts | Transaction entity |
| CVCRD01Y.cpy | entities/CardRecord.ts | Card record variant |
| CVCUS01Y.cpy | entities/CustomerRecord.ts | Customer record variant |
| CSDAT01Y.cpy | entities/DailyTransactionRecord.ts | Daily transaction |
| CSMSG01Y.cpy | entities/DisclosureGroup.ts | Message/disclosure |
| CSTRNX01.cpy | entities/TransactionType.ts | Transaction type |
| CSUSR01Y.cpy | entities/UserSecurityRecord.ts | User security |
| Remaining copybooks | entities/*.ts | Utility/shared structures |
