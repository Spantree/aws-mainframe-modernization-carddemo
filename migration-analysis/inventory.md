# CardDemo Mainframe Inventory Report

**Scan Date:** 2026-02-28
**Analyst:** Inventory Analyst
**Source Root:** `app/`

---

## 1. Executive Summary

The AWS CardDemo application is a COBOL mainframe credit card management system
comprising 44 COBOL programs, 30 copybooks, 17 BMS screen mapsets, 38 JCL batch
jobs, and 2 assembler utilities. The codebase uses CICS for online transaction
processing against VSAM files, with three optional variant modules adding IMS
DL/I, DB2 embedded SQL, and IBM MQ messaging capabilities.

| Category                  | Count | Total Lines |
| ------------------------- | ----- | ----------- |
| COBOL programs (main app) | 31    | 20,650      |
| COBOL programs (variants) | 13    | 9,525       |
| Assembler programs        | 2     | 114         |
| Copybooks                 | 30    | 2,786       |
| BMS mapsets               | 17    | 4,472       |
| JCL jobs                  | 38    | 2,429       |
| JCL procedures            | 2     | 114         |
| **Total (all source)**    |       | **40,090**  |

**Language breakdown (main app):**

| Language    | Programs |
| ----------- | -------- |
| COBOL Batch | 12       |
| CICS Online | 17       |
| Called Sub  | 2        |
| Assembler   | 2        |

**Technologies present:** CICS, VSAM (KSDS, AIX), BMS, IBM Language Environment
(LE), GDG

**Optional variant technologies:** IMS DL/I, DB2 embedded SQL, IBM MQ

---

## 2. Program Inventory

### 2.1 Main Application — `app/cbl/`

| Program  | Type           | Lines | LOC   | GOTO | PERF | EVAL | Description                                      |
| -------- | -------------- | ----- | ----- | ---- | ---- | ---- | ------------------------------------------------ |
| CBACT01C | Batch          | 430   | 358   | 0    | 36   | 0    | Read account VSAM; write sequential/array/varlen |
| CBACT02C | Batch          | 178   | 129   | 0    | 11   | 0    | Read and print credit card VSAM file             |
| CBACT03C | Batch          | 178   | 130   | 0    | 11   | 0    | Read and print card cross-reference VSAM file    |
| CBACT04C | Batch          | 652   | 552   | 0    | 57   | 0    | Interest calculation per discount group          |
| CBCUS01C | Batch          | 178   | 130   | 0    | 11   | 0    | Read and print customer VSAM file                |
| CBEXPORT | Batch          | 582   | 396   | 0    | 50   | 0    | Export all entities to migration file            |
| CBIMPORT | Batch          | 487   | 337   | 0    | 30   | 2    | Import migration file to VSAM files              |
| CBSTM03A | Batch ⚠️       | 924   | 784   | 15   | 33   | 9    | Account statement generator (text + HTML)        |
| CBSTM03B | Called Sub ⚠️  | 230   | 162   | 13   | 4    | 1    | File I/O subprogram called by CBSTM03A           |
| CBTRN01C | Batch          | 494   | 415   | 0    | 43   | 0    | Read daily transaction file; lookup xref/acct    |
| CBTRN02C | Batch          | 731   | 619   | 0    | 62   | 0    | Post daily transactions; update VSAM balances    |
| CBTRN03C | Batch          | 649   | 545   | 0    | 73   | 4    | Print transaction detail report                  |
| COBSWAIT | Batch          | 41    | 13    | 0    | 0    | 0    | Utility: wait N centiseconds via MVSWAIT         |
| CSUTLDTC | Called Sub     | 157   | 114   | 0    | 1    | 2    | Date validation; wraps IBM LE CEEDAYS            |
| COACTUPC | CICS Online ⚠️ | 4,236 | 3,368 | 51   | 64   | 20   | Account update — full VSAM read/write/validate   |
| COACTVWC | CICS Online    | 941   | 703   | 9    | 21   | 10   | Account view — read-only display                 |
| COADM01C | CICS Online    | 288   | 189   | 0    | 15   | 4    | Admin menu; trans ID CA00                        |
| COBIL00C | CICS Online    | 572   | 420   | 0    | 38   | 18   | Bill payment; posts payment transaction; ID CB00 |
| COCRDLIC | CICS Online    | 1,459 | 1,093 | 16   | 34   | 18   | Credit card list — paginated VSAM browse         |
| COCRDSLC | CICS Online    | 887   | 642   | 9    | 19   | 8    | Credit card select — search and select           |
| COCRDUPC | CICS Online    | 1,560 | 1,195 | 21   | 26   | 16   | Credit card update — add/modify card details     |
| COMEN01C | CICS Online    | 308   | 213   | 0    | 15   | 6    | Main menu; entry point for regular users         |
| CORPT00C | CICS Online    | 649   | 498   | 1    | 35   | 10   | Report menu; initiates batch via CICS START      |
| COSGN00C | CICS Online    | 260   | 172   | 0    | 11   | 6    | Sign-on; authenticates vs. USRSEC VSAM           |
| COTRN00C | CICS Online    | 699   | 529   | 0    | 47   | 16   | Transaction list — paginated VSAM browse         |
| COTRN01C | CICS Online    | 330   | 231   | 0    | 17   | 6    | Transaction view — single record display         |
| COTRN02C | CICS Online    | 783   | 614   | 0    | 61   | 26   | Transaction add — create new transaction         |
| COUSR00C | CICS Online    | 695   | 531   | 0    | 45   | 16   | User list — admin only, VSAM browse              |
| COUSR01C | CICS Online    | 299   | 198   | 0    | 20   | 6    | User view — display user record                  |
| COUSR02C | CICS Online    | 414   | 303   | 0    | 31   | 10   | User add — create security record                |
| COUSR03C | CICS Online    | 359   | 251   | 0    | 26   | 10   | User delete — remove security record             |

⚠️ = complexity flags: high GOTO count or exceptional size

**Subtotals — main app:**

| Type        | Count  | Total Lines | Total LOC  |
| ----------- | ------ | ----------- | ---------- |
| Batch       | 12     | 5,124       | 4,403      |
| Called Sub  | 2      | 387         | 276        |
| CICS Online | 17     | 15,139      | 11,155     |
| **Total**   | **31** | **20,650**  | **15,834** |

### 2.2 Variant Modules

#### VSAM + MQ variant — `app/app-vsam-mq/cbl/`

| Program  | Type    | Lines | Description                                   |
| -------- | ------- | ----- | --------------------------------------------- |
| COACCT01 | CICS+MQ | 620   | Account inquiry; publishes events to MQ queue |
| CODATE01 | CICS+MQ | 524   | Date service via CICS START/RETRIEVE + MQ     |

#### DB2 Transaction Types variant — `app/app-transaction-type-db2/cbl/`

| Program  | Type      | Lines | Description                                   |
| -------- | --------- | ----- | --------------------------------------------- |
| COBTUPDT | Batch+DB2 | 237   | Bulk update transaction type codes in DB2     |
| COTRTLIC | CICS+DB2  | 2,098 | Browse/select transaction type codes from DB2 |
| COTRTUPC | CICS+DB2  | 1,702 | Add/modify transaction type codes in DB2      |

#### IMS + DB2 + MQ Authorization variant — `app/app-authorization-ims-db2-mq/cbl/`

| Program  | Type      | Lines | Description                                       |
| -------- | --------- | ----- | ------------------------------------------------- |
| CBPAUP0C | Batch+IMS | 386   | Payment authorization processing via IMS DL/I     |
| COPAUA0C | CICS+IMS  | 1,026 | Authorization inquiry; reads IMS records via DL/I |
| COPAUS0C | CICS+IMS  | 1,032 | Authorization setup; manages IMS segment data     |
| COPAUS1C | CICS+IMS  | 604   | Authorization setup variant 1 (alt screen flow)   |
| COPAUS2C | CICS+IMS  | 244   | Authorization setup variant 2 (confirmation)      |
| DBUNLDGS | Batch+DB2 | 366   | DB2 unload utility; extracts auth table to file   |
| PAUDBLOD | Batch+DB2 | 369   | DB2 load; bulk loads authorization data           |
| PAUDBUNL | Batch+IMS | 317   | IMS unload; extracts IMS auth data to file        |

### 2.3 Assembler Programs — `app/asm/`

| Program  | Lines | Called By | Description                                        |
| -------- | ----- | --------- | -------------------------------------------------- |
| COBDATFT | 84    | CBACT01C  | Date formatter; converts internal date to output   |
| MVSWAIT  | 30    | COBSWAIT  | MVS wait routine; STIMER SVC for centisecond delay |

---

## 3. Copybook Inventory

All copybooks reside in `app/cpy/`. BMS-generated copybooks reside in
`app/cpy-bms/` (not listed individually — one per BMS mapset).

| Copybook | Lines | Consumer Count | Key Data Structures          | Purpose                                     |
| -------- | ----- | -------------- | ---------------------------- | ------------------------------------------- |
| COADM02Y | 62    | 1              | CARDDEMO-ADMIN-OPT-DATA      | Admin menu option definitions               |
| COCOM01Y | 47    | 25             | CARDDEMO-COMMAREA            | CICS commarea — shared by ALL CICS programs |
| CODATECN | 52    | 1              | WS-DATE-CONVERSION-DATA      | Date conversion working storage             |
| COMEN02Y | 101   | 1              | CARDDEMO-MAIN-MENU-DATA      | Main menu data definitions                  |
| COSTM01  | 38    | 1              | COSTMT-RECORD                | Account statement record layout             |
| COTTL01Y | 27    | 18             | CARDDEMO-TITLE-DATA          | Screen title/header fields                  |
| CSDAT01Y | 58    | 17             | WS-CURRENT-DATE-DATA         | Current date/time working storage           |
| CSLKPCDY | 1,318 | 1              | WS-STATE-DATA, WS-ZIP-DATA   | US state/zip/phone lookup tables (LARGE)    |
| CSMSG01Y | 24    | 17             | CARDDEMO-MSG-DATA            | Screen error/info message text              |
| CSMSG02Y | 35    | 2              | CARDDEMO-MSG02-DATA          | Secondary screen messages                   |
| CSSETATY | 30    | 1              | WS-SCREEN-ATTR               | Screen attribute template (COPY REPLACING)  |
| CSSTRPFY | 85    | 0              | WS-STRING-PARSE-DATA         | String parse working storage (UNUSED)       |
| CSUSR01Y | 26    | 17             | CARDDEMO-USER-DATA           | Current user context (ID, type)             |
| CSUTLDPY | 375   | 4              | WS-DATE-PROC-DATA            | Date utility procedure paragraphs (inline)  |
| CSUTLDWY | 89    | 2              | WS-DATE-UTILS-DATA           | Date utility working storage                |
| CUSTREC  | 26    | 1              | CUSTOMER-RECORD              | Customer record (alt layout for CBSTM03A)   |
| CVACT01Y | 20    | 11             | ACCOUNT-RECORD               | Account master record (primary entity)      |
| CVACT02Y | 14    | 5              | CARD-RECORD                  | Credit card record                          |
| CVACT03Y | 11    | 13             | CARD-XREF-RECORD             | Card-to-account cross-reference record      |
| CVCRD01Y | 46    | 2              | CC-ACCT-ID-DATA, CC-DETAILS  | Credit card CICS screen data                |
| CVCUS01Y | 26    | 7              | CUSTOMER-RECORD              | Customer master record (primary entity)     |
| CVEXPORT | 103   | 2              | EXPORT-RECORD                | Multi-record export/import file layout      |
| CVTRA01Y | 13    | 2              | TRAN-CATEGORY-BALANCE-RECORD | Transaction category balance                |
| CVTRA02Y | 13    | 1              | TRAN-TYPE-RECORD             | Transaction type code record                |
| CVTRA03Y | 10    | 1              | TRAN-REPORT-HEADER           | Transaction report header line              |
| CVTRA04Y | 12    | 1              | TRAN-REPORT-DETAIL           | Transaction report detail line              |
| CVTRA05Y | 21    | 9              | TRAN-RECORD                  | Transaction master record (primary entity)  |
| CVTRA06Y | 21    | 2              | DAILY-TRAN-RECORD            | Daily transaction input record              |
| CVTRA07Y | 73    | 1              | TRAN-REPORT-TOTALS           | Transaction report totals                   |
| UNUSED1Y | 10    | 0              | (empty)                      | Unused stub — dead code candidate           |

**Notes:**

- `COCOM01Y` is the CICS communications backbone — consumed by all 17 main CICS
  programs and all 8 variant CICS programs (25 total consumers). Any change
  requires coordinated regression across the entire online tier.
- `CSLKPCDY` at 1,318 lines is the largest copybook, containing hardcoded US
  geographic lookup tables. This data should be extracted to a reference table in
  the target PostgreSQL database.
- `CSUTLDPY` (375 lines) contains inline procedure paragraphs — not data
  definitions. This pattern is unusual; the paragraphs are effectively
  subroutines embedded via COPY.
- `CSSTRPFY` and `UNUSED1Y` have zero consumers — dead code candidates.

---

## 4. BMS Map Inventory

All mapsets reside in `app/bms/`. Compiled copybooks are in `app/cpy-bms/`.

| Mapset  | Map     | Lines | Associated Program | Screen Description           |
| ------- | ------- | ----- | ------------------ | ---------------------------- |
| COACTUP | CACTUPA | 512   | COACTUPC           | Account update form          |
| COACTVW | CACTVWA | 378   | COACTVWC           | Account view (read-only)     |
| COADM01 | COADM1A | 167   | COADM01C           | Admin menu selection         |
| COBIL00 | CBIL0A  | 141   | COBIL00C           | Bill payment entry           |
| COCRDLI | CCRDLIA | 344   | COCRDLIC           | Credit card list (paginated) |
| COCRDSL | CCRDSLA | 157   | COCRDSLC           | Credit card search/select    |
| COCRDUP | CCRDUPA | 172   | COCRDUPC           | Credit card add/update form  |
| COMEN01 | CMEN01A | 167   | COMEN01C           | Main menu (regular users)    |
| CORPT00 | CRPT0A  | 231   | CORPT00C           | Report selection menu        |
| COSGN00 | CSGN0A  | 210   | COSGN00C           | Sign-on / login screen       |
| COTRN00 | CTRN0A  | 464   | COTRN00C           | Transaction list (paginated) |
| COTRN01 | CTRN1A  | 273   | COTRN01C           | Transaction detail view      |
| COTRN02 | CTRN2A  | 307   | COTRN02C           | Transaction add form         |
| COUSR00 | CUSR0A  | 463   | COUSR00C           | User list (admin only)       |
| COUSR01 | CUSR1A  | 164   | COUSR01C           | User detail view             |
| COUSR02 | CUSR2A  | 169   | COUSR02C           | User add form                |
| COUSR03 | CUSR3A  | 153   | COUSR03C           | User delete confirmation     |

Each CICS program uses exactly one mapset. There is a strict 1:1 program-to-map
relationship throughout the application.

---

## 5. JCL Job Inventory

All jobs reside in `app/jcl/`. Two reusable procedures reside in `app/proc/`.

### 5.1 Data Setup / File Definition Jobs

| Job      | Lines | Programs Invoked | Purpose                                   |
| -------- | ----- | ---------------- | ----------------------------------------- |
| ACCTFILE | 65    | IDCAMS           | Define account VSAM KSDS cluster          |
| CARDFILE | 128   | IDCAMS           | Define card VSAM KSDS cluster             |
| CUSTFILE | 84    | IDCAMS           | Define customer VSAM KSDS cluster         |
| XREFFILE | 106   | IDCAMS           | Define card xref VSAM KSDS cluster        |
| TRANFILE | 125   | IDCAMS           | Define transaction VSAM KSDS cluster      |
| DUSRSECJ | 92    | IDCAMS           | Define user security VSAM cluster         |
| TCATBALF | 65    | IDCAMS           | Define tran category balance VSAM file    |
| TRANCATG | 65    | IDCAMS           | Define transaction category VSAM file     |
| TRANTYPE | 65    | IDCAMS           | Define transaction type VSAM file         |
| TRANIDX  | 58    | IDCAMS           | Build alternate index on transaction file |
| DEFCUST  | 47    | IDCAMS           | Define customer VSAM cluster (alt)        |
| DEFGDGB  | 63    | IDCAMS           | Define GDG base datasets                  |
| DEFGDGD  | 94    | IDCAMS           | Define GDG generation datasets            |
| DISCGRP  | 65    | IDCAMS           | Define/load discount group VSAM file      |
| OPENFIL  | 34    | IDCAMS           | Open/enable VSAM files                    |
| CLOSEFIL | 34    | IDCAMS           | Close/disable VSAM files                  |
| ESDSRRDS | 124   | IDCAMS           | Convert ESDS to RRDS format               |
| PRTCATBL | 66    | IEBPTPCH         | Print catalog/table contents              |

### 5.2 Batch Processing Jobs

| Job      | Lines | Programs Invoked       | Purpose                                   |
| -------- | ----- | ---------------------- | ----------------------------------------- |
| READACCT | 50    | IEFBR14, CBACT01C      | Export account VSAM to sequential files   |
| READCARD | 31    | CBACT02C               | Print card data                           |
| READCUST | 30    | CBCUS01C               | Print customer data                       |
| READXREF | 31    | CBACT03C               | Print cross-reference data                |
| INTCALC  | 44    | CBACT04C               | Run interest calculation with date PARM   |
| POSTTRAN | 45    | CBTRN02C               | Post daily transactions to account VSAM   |
| TRANREPT | 84    | SORT, CBTRN03C         | Sort then print transaction detail report |
| CREASTMT | 97    | SORT, IDCAMS, CBSTM03A | Sort then generate account statements     |
| CBEXPORT | 72    | CBEXPORT               | Export all entities to migration file     |
| CBIMPORT | 68    | CBIMPORT               | Import migration file to VSAM             |
| COMBTRAN | 52    | SORT                   | Combine and sort transaction files        |
| TRANBKP  | 71    | DFSRRC00, IDCAMS       | Transaction backup using IMS utilities    |
| WAITSTEP | 27    | COBSWAIT               | Execute wait utility step                 |
| DALYREJS | 32    | IEFBR14                | Allocate daily transaction reject file    |
| REPTFILE | 32    | IEFBR14                | Allocate report output file               |
| TXT2PDF1 | 41    | BSTPDF                 | Convert text report to PDF                |

### 5.3 System / Admin Jobs

| Job      | Lines | Programs Invoked | Purpose                                        |
| -------- | ----- | ---------------- | ---------------------------------------------- |
| CBADMCDJ | 167   | DFHCSDUP         | Load CICS resource definitions (CSD)           |
| FTPJCL   | 42    | FTP              | FTP transfer — SECURITY: hardcoded credentials |
| INTRDRJ1 | 19    | INTRDR           | Internal reader JCL submission                 |
| INTRDRJ2 | 14    | INTRDR           | Internal reader JCL submission (variant)       |

### 5.4 JCL Procedures (`app/proc/`)

| Procedure | Lines | Purpose                                      |
| --------- | ----- | -------------------------------------------- |
| TRANREPT  | 82    | Reusable procedure for transaction reporting |
| REPROC    | 32    | Reusable procedure for report reprocessing   |

---

## 6. File / Dataset Inventory

### 6.1 VSAM Files

| Dataset  | Type | Key Field             | Readers                                                                                                                  | Writers                                          |
| -------- | ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| ACCTFILE | KSDS | ACCT-ID (PIC 9(11))   | CBACT01C, CBACT04C, CBTRN01C, CBSTM03A, COACTUPC, COACTVWC, COBIL00C, COCRDUPC, COACCT01                                 | CBACT04C, CBIMPORT, CBTRN02C, COACTUPC, COBIL00C |
| CARDFILE | KSDS | CARD-NUM (PIC 9(16))  | CBACT02C, CBTRN01C, COCRDLIC, COCRDUPC                                                                                   | CBIMPORT, COCRDUPC                               |
| CARDXREF | KSDS | XREF-CARD-NUM (9(16)) | CBACT03C, CBACT04C, CBTRN01C, CBTRN02C, CBSTM03A, COACTUPC, COACTVWC, COBIL00C, COCRDLIC, COCRDSLC, COCOTRN02C, COACCT01 | CBIMPORT, COCRDUPC                               |
| CUSTFILE | KSDS | CUST-ID (PIC 9(9))    | CBCUS01C, CBTRN01C, CBSTM03A, COACTUPC, COACTVWC, COACCT01                                                               | CBIMPORT, COACTUPC                               |
| TRANSACT | KSDS | TRAN-ID (PIC 9(16))   | CBACT04C, CBTRN03C, COTRN00C, COTRN01C                                                                                   | CBIMPORT, CBTRN02C, COBIL00C, COTRN02C           |
| USRSEC   | KSDS | USER-ID (PIC X(8))    | COSGN00C, COUSR00C, COUSR01C                                                                                             | COUSR02C, COUSR03C (delete)                      |
| DISCGRP  | KSDS | DISC-GROUP-ID (X(10)) | CBACT04C                                                                                                                 | (setup JCL only)                                 |
| CXACAIX  | AIX  | ACCT-ID (alt on XREF) | COBIL00C (via alternate index path)                                                                                      |                                                  |

### 6.2 Sequential Files

| File          | Read By            | Written By         | Purpose                       |
| ------------- | ------------------ | ------------------ | ----------------------------- |
| DALYTRAN      | CBTRN01C, CBTRN02C | (external feed)    | Daily transaction input file  |
| STMTFILE-TEXT |                    | CBSTM03A           | Account statement text output |
| STMTFILE-HTML |                    | CBSTM03A           | Account statement HTML output |
| EXPORT-FILE   | CBIMPORT           | CBEXPORT           | Migration multi-record export |
| REPORT-FILE   |                    | CBTRN01C, CBTRN03C | Batch report output           |
| REJECT-FILE   |                    | CBTRN02C           | Transaction reject/error file |
| SYSIN         | COBSWAIT           | (operator/JCL)     | Centisecond wait parameter    |

---

## 7. Technology Fingerprint

| Technology           | Status  | Details                                                                                       |
| -------------------- | ------- | --------------------------------------------------------------------------------------------- |
| **CICS**             | Present | 17 main programs + 10 variant programs; all use DFHCOMMAREA via COCOM01Y                      |
| **VSAM KSDS**        | Present | 8 KSDS files + 1 alternate index; primary persistent storage layer                            |
| **BMS**              | Present | 17 mapsets; strict 1:1 program-to-map; 3270 terminal UI                                       |
| **IBM Language Env** | Present | CEE3ABD (abend handler) in all batch programs; CEEDAYS in CSUTLDTC                            |
| **IMS DL/I**         | Variant | app-authorization-ims-db2-mq only; via CBLTDLI interface                                      |
| **DB2 Embedded SQL** | Variant | app-transaction-type-db2 and app-authorization-ims-db2-mq; SELECT/INSERT/UPDATE/DELETE/CURSOR |
| **IBM MQ**           | Variant | app-vsam-mq and app-authorization-ims-db2-mq; event publishing                                |
| **RACF**             | Absent  | No RACF calls; application-level security only (USRSEC VSAM)                                  |
| **GDG**              | Present | Generation Data Groups defined in DEFGDGB/DEFGDGD JCL                                         |
| **Assembler**        | Present | COBDATFT (date format) and MVSWAIT (wait); must be re-implemented in TypeScript               |

---

## 8. Notable Findings

### 8.1 Complexity Hotspots

- **COACTUPC** (4,236 lines, 51 GO TO statements) — largest program by far;
  account update with inline field-attribute generation via `COPY REPLACING`
  (39 occurrences of CSSETATY with REPLACING). High migration complexity.
- **CBSTM03A** (924 lines, 15 GO TO) — uses `ALTER/GO TO` (deprecated COBOL
  control flow that dynamically modifies jump targets at runtime). Also accesses
  low-level mainframe control blocks (PSA/TCB/TIOT) via POINTER arithmetic.
  Requires careful refactoring.
- **COTRTLIC / COTRTUPC** (2,098 / 1,702 lines) — largest DB2 variant programs.

### 8.2 Dead Code Candidates

- **CSSTRPFY** — string parsing copybook with zero consumers; never referenced
  by any program scanned.
- **UNUSED1Y** — empty stub copybook; zero consumers.

### 8.3 Security Finding

- **FTPJCL.JCL** — hardcoded FTP credentials (username/password) found at lines
  33–35. Full details in `migration/credential-scan.md`. Credentials redacted
  from this report. Severity: HIGH. Recommendation: remove from source control
  or parameterize via a secure credential store.

### 8.4 Architecture Patterns

- **Pseudo-conversational CICS** — all CICS programs use `EXEC CICS RETURN
TRANSID(...)` to maintain state via DFHCOMMAREA rather than keeping programs
  resident. Standard mainframe CICS pattern; maps to stateless REST/GraphQL +
  client-side session (JWT) in NestJS.
- **VSAM as database** — all persistent data is in VSAM KSDS files; no
  relational joins, only navigational key lookup. Direct mapping to PostgreSQL
  tables is straightforward.
- **Application-level security** — sign-on and user management implemented in
  application code against USRSEC VSAM; no OS-level RACF. Must be replaced with
  proper IAM (NestJS Guards + Passport JWT, or Keycloak) in the NestJS service.
- **Batch/Online separation** — clean separation between CICS online programs
  (CO\*) and batch programs (CB\*); minimal coupling between tiers except through
  shared VSAM files.

---

## 9. Migration Readiness Summary

| Dimension               | Assessment                                                                    |
| ----------------------- | ----------------------------------------------------------------------------- |
| Data model clarity      | Good — VSAM layouts map cleanly to relational tables via copybooks            |
| Online logic complexity | Moderate-High — CICS commarea/pseudo-conversational patterns require redesign |
| Batch logic complexity  | Low-Moderate — mostly sequential file processing, straightforward ETL         |
| Technology debt         | Moderate — ALTER/GO TO in CBSTM03A, assembler interop, LE runtime calls       |
| Security debt           | High — application-level auth; hardcoded FTP credentials                      |
| Test coverage           | Unknown — no test harnesses found in source tree                              |
| Documentation           | Minimal — no inline comments beyond standard headers                          |

---

_Generated by Inventory Analyst — CardDemo Mainframe Migration Project_
