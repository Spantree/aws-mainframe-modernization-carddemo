# CardDemo Migration Clusters

**Generated:** 2026-02-28
**Method:** Strongly Connected Component (SCC) analysis + file-sharing coupling + JCL pipeline tracing

Clusters represent units that must be planned/migrated together due to bidirectional dependencies, shared state, or orchestration coupling.

***

## Summary

| Cluster | Programs | Type | Migration Risk | Priority |
|---------|----------|------|----------------|---------|
| CL-00 | COSGN00C | Entry point | LOW | 1st — session boundary |
| CL-01 | COMEN01C | Navigation hub | LOW | 2nd — menu dispatch |
| CL-02 | COADM01C | Navigation hub | LOW | 2nd — admin dispatch |
| CL-03 | COACTUPC, COACTVWC | Account CRUD | HIGH | Phase 2 |
| CL-04 | COCRDLIC, COCRDSLC, COCRDUPC | Card CRUD | HIGH | Phase 2 |
| CL-05 | COTRN00C, COTRN01C, COTRN02C | Transaction CRUD | HIGH | Phase 2 |
| CL-06 | COUSR00C, COUSR01C, COUSR02C, COUSR03C | User Management | MEDIUM | Phase 2 |
| CL-07 | COBIL00C | Bill Payment | MEDIUM | Phase 2 |
| CL-08 | CORPT00C | Report Trigger | MEDIUM | Phase 3 |
| CL-09 | CBTRN02C | Transaction Posting | HIGH | Phase 1 (batch) |
| CL-10 | CBACT04C | Interest Calculation | HIGH | Phase 1 (batch) |
| CL-11 | CBSTM03A, CBSTM03B | Statement Generation | MEDIUM | Phase 1 (batch) |
| CL-12 | CBEXPORT, CBIMPORT | Migration Tools | LOW | Utility |
| CL-13 | CBTRN01C, CBTRN03C | Transaction Reports | LOW | Phase 1 (batch) |
| CL-14 | CBACT01C, CBACT02C, CBACT03C, CBCUS01C | Data Readers | LOW | Phase 1 (leaf) |
| CL-15 | COTRTLIC, COTRTUPC, COBTUPDT | DB2 Transaction Types | MEDIUM | Phase 3 (variant) |
| CL-16 | CBPAUP0C, COPAUA0C, COPAUS0C, COPAUS1C, COPAUS2C | IMS Authorization | VERY HIGH | Phase 4 (variant) |
| CL-17 | CSUTLDTC, COBSWAIT, COBDATFT | Utilities | LOW | Phase 1 (leaf) |

***

## CL-00: Entry Point — Signon

**Programs:** COSGN00C
**Transaction:** CC00
**Files:** USRSEC (READ)
**Copybooks:** COCOM01Y, COSGN00, COTTL01Y, CSDAT01Y, CSMSG01Y, CSUSR01Y, DFHAID, DFHBMSCA
**BMS:** COSGN00 (CSGN0A)

**Coupling:** Routes to COMEN01C (regular users) or COADM01C (admin users) via XCTL.

**Migration Notes:**

* Application-level security only — no RACF. USRSEC VSAM holds user IDs and passwords.
* Replace with JWT/session-based authentication against PostgreSQL users table.
* Single entry point for all sessions — high value to get right first.
* CICS COMMAREA (COCOM01Y) passes user context downstream — must design a TypeScript equivalent (JWT claims + request DTO).

***

## CL-01: Main Menu — User Navigation Hub

**Programs:** COMEN01C
**Transaction:** CM00
**Files:** None
**Copybooks:** COCOM01Y, COMEN01, COMEN02Y (menu option table), COTTL01Y, CSDAT01Y, CSMSG01Y, CSUSR01Y, DFHAID, DFHBMSCA
**BMS:** COMEN01 (CMEN01A)
**Dynamic targets (11):** COACTVWC, COACTUPC, COCRDLIC, COCRDSLC, COCRDUPC, COTRN00C, COTRN01C, COTRN02C, CORPT00C, COBIL00C, COPAUS0C

**Migration Notes:**

* Pure navigation — no file I/O; migrates to a React router/nav component.
* Special case: COPAUS0C (IMS variant) tested at runtime via EXEC CICS INQUIRE — soft dependency.
* The COMEN02Y table drives the menu options — becomes a React menu configuration.

***

## CL-02: Admin Menu — Admin Navigation Hub

**Programs:** COADM01C
**Transaction:** CA00
**Files:** None
**Dynamic targets (6):** COUSR00C, COUSR01C, COUSR02C, COUSR03C, COTRTLIC (DB2 variant), COTRTUPC (DB2 variant)

**Migration Notes:**

* DB2 variant options (5, 6) only available if COTRTLIC/COTRTUPC are installed.
* Route to role-based access control (RBAC) in the NestJS/GraphQL layer.

***

## CL-03: Account Management (SCC — Bidirectional)

**Programs:** COACTUPC ↔ COACTVWC
**Transactions:** CAUP (COACTUPC), CAVW (COACTVWC)
**Files Shared:**

* ACCTDAT: COACTVWC (READ), COACTUPC (READ + REWRITE)
* CUSTDAT: COACTVWC (READ), COACTUPC (READ + REWRITE)
* CARDDAT: COACTVWC (READ), COACTUPC (READ + REWRITE)
* CCXREF: COACTVWC (READ), COACTUPC (READ)
  **Copybooks shared:** COCOM01Y, CVACT01Y, CVACT03Y, CVCUS01Y, CVCRD01Y, CSMSG02Y

**Coupling analysis:**

* COACTUPC is the largest program (4,236 lines) and most complex in the codebase.
* Both programs hold a "current account" in COMMAREA across XCTL transitions.
* COACTUPC uses CSSETATY with COPY REPLACING 39 times — screen attribute complexity.
* COACTUPC has 51 GO TO statements — complex control flow requiring careful re-engineering.

**SCC:** Yes — mutual XCTL means programs continuously transfer control to each other.

**Migration Strategy:**

* Combine into a single NestJS service: `AccountService` (GET + PUT operations).
* React component: `AccountDetail` with read/edit modes toggling in-place.
* Map COMMAREA account-ID to URL path parameter.

***

## CL-04: Card Management (SCC — Circular)

**Programs:** COCRDLIC → COCRDSLC ↔ COCRDUPC
**Transactions:** CCLI (COCRDLIC), CCDL (COCRDSLC), CCUP (COCRDUPC)
**Files Shared:**

* CARDDAT: COCRDLIC (READ), COCRDUPC (READ/WRITE/REWRITE)
* CCXREF: COCRDLIC (BROWSE), COCRDSLC (READ/BROWSE), COCRDUPC (READ)
* ACCTFILE: COCRDUPC (READ — to validate account linkage)

**Coupling analysis:**

* COCRDSLC ↔ COCRDUPC: bidirectional XCTL (true SCC)
* COCRDLIC → COCRDUPC: one-way
* Card selection (COCRDSLC) passes selected card number in COMMAREA to COCRDUPC
* COCRDLIC uses VSAM STARTBR/READNEXT for paginated browse — 1,459 lines

**Migration Strategy:**

* NestJS service: `CardService` (list, get, create, update)
* React components: `CardList` (paginated), `CardDetail`, `CardForm`
* Replace VSAM browse with PostgreSQL paginated query (LIMIT/OFFSET or cursor)

***

## CL-05: Transaction Management (SCC — Circular)

**Programs:** COTRN00C ↔ COTRN01C, COTRN00C ↔ COTRN02C
**Transactions:** CT00, CT01, CT02
**Files Shared:**

* TRANSACT: COTRN00C (BROWSE), COTRN01C (READ), COTRN02C (WRITE)
* CCXREF: COTRN02C (READ — card validation)

**Coupling analysis:**

* All three share TRANSACT VSAM file
* COTRN02C also calls CSUTLDTC for date validation
* COTRN00C is the pivot: COTRN01C and COTRN02C both XCTL back to it

**Migration Strategy:**

* NestJS service: `TransactionService` (list, get, create)
* GraphQL: `transactions(accountId)`, `transaction(id)`, `createTransaction(...)`
* Date validation: move to class-validator decorators on DTOs (or a custom validator)

***

## CL-06: User Management

**Programs:** COUSR00C → COUSR01C / COUSR02C / COUSR03C (one-way XCTL)
**Transactions:** CU00, CU01, CU02, CU03
**Files Shared:** USRSEC (all programs)

**Coupling analysis:**

* COUSR00C is the list hub; sub-programs are true leaf nodes
* COUSR01C: view only (READ)
* COUSR02C: create (READ existing + WRITE new)
* COUSR03C: delete (READ + DELETE)

**Migration Strategy:**

* NestJS service: `UserService` (list, get, create, delete)
* Security: replace USRSEC VSAM with PostgreSQL users table
* Admin-only: enforce via NestJS `@Roles('ADMIN')` + `RolesGuard`

***

## CL-07: Bill Payment

**Programs:** COBIL00C
**Transaction:** CB00
**Files:**

* ACCTDAT (READ + REWRITE — debit balance)
* CXACAIX (READ via alternate index — lookup account from card number)
* TRANSACT (WRITE — post payment transaction)

**Coupling analysis:**

* Reads account via CXACAIX alternate index (account key on CARDXREF)
* Writes a payment transaction record
* XCTLs to COTRN00C after payment — cross-cluster dependency

**Migration Strategy:**

* NestJS service: `PaymentService.submitPayment(cardNum, amount)`
* PostgreSQL transaction: UPDATE account SET balance = balance - payment; INSERT INTO transactions
* GraphQL mutation: `submitPayment`

***

## CL-08: Report Trigger (CICS-to-Batch Bridge)

**Programs:** CORPT00C
**Transaction:** CR00
**Files:** None directly
**Special:** EXEC CICS START + WRITEQ TD JOBS (internal reader) — submits batch JCL

**Coupling analysis:**

* Only CICS program that bridges to batch via internal reader TD queue
* Uses CSUTLDTC for date validation (shared utility)
* High risk: JOBS TD queue and internal reader are CICS-specific mechanisms

**Migration Strategy:**

* Replace CICS START + TD queue with an async job trigger (e.g., BullMQ + Kafka, or AWS Step Functions)
* GraphQL mutation: `triggerTransactionReport(dateRange)` returns jobId
* React: polling component or WebSocket for report status

***

## CL-09: Transaction Posting (Core Batch)

**Programs:** CBTRN02C
**JCL:** POSTTRAN
**Files:** DALYTRAN (INPUT), TRANSACT (I-O), CARDXREF (INPUT), ACCTFILE (I-O), DALYREJS (+1 GDG output)

**Coupling analysis:**

* Most critical batch job — posts daily transactions to account balances
* Writes DALYREJS GDG for rejected transactions (consumed downstream)
* Shares TRANSACT and ACCTFILE with CBACT04C (interest)
* 731 lines, 62 PERFORMs, 0 GOTOs — relatively structured

**Migration Strategy:**

* BullMQ processor: `post-transaction` job
* PostgreSQL transaction: BEGIN; UPDATE accounts; INSERT transactions; COMMIT
* Idempotency key on TRAN-ID for retry safety

***

## CL-10: Interest Calculation (Core Batch)

**Programs:** CBACT04C
**JCL:** INTCALC
**Files:** TCATBALF (INPUT), DISCGRP (INPUT), CARDXREF (INPUT), ACCTFILE (I-O), TRANSACT (WRITE → SYSTRAN GDG)

**Coupling analysis:**

* Complex business logic: 652 lines, 57 PERFORMs
* Takes date parameter via JCL PARM — must be converted to job argument
* Writes interest transactions as SYSTRAN GDG (consumed by COMBTRAN)
* GDG ordering creates implicit sequencing: POSTTRAN must precede INTCALC

**Migration Strategy:**

* BullMQ scheduled job (or NestJS `@Cron`) with date parameter
* PostgreSQL: read account balances + discount groups, compute interest, insert transaction records

***

## CL-11: Statement Generation (Batch Subprogram Pair)

**Programs:** CBSTM03A (main) + CBSTM03B (file I/O subroutine)
**JCL:** CREASTMT
**Files:** TRANSACT (sort input), ACCTFILE + CARDXREF + CUSTFILE (via CBSTM03B), outputs: STMTFILE-TEXT + STMTFILE-HTML

**Coupling analysis:**

* CBSTM03B is a file I/O concentrator — all file access goes through it
* CBSTM03A has 15 GO TO statements (ALTER/GO TO pattern — deprecated COBOL)
* Generates both text and HTML output formats
* 924 + 230 lines total

**Migration Strategy:**

* NestJS service: `StatementService.generateStatements(month, year)`
* Template engine (Handlebars / EJS / React server rendering) for HTML output
* Refactor file I/O subroutine pattern: all data access in a repository layer

***

## CL-12: Migration Utilities

**Programs:** CBEXPORT, CBIMPORT
**JCL:** CBEXPORT.jcl, CBIMPORT.jcl
**Files:** All 5 core VSAM files

**Purpose:** One-time migration data tools — export all CardDemo entities to a multi-record flat file for migration; inverse import.

**Migration Notes:**

* These are not production workflow programs — migration support only.
* Target: write a migration script that reads the EXPORT.DATA file and loads PostgreSQL.
* Can be retired after migration.

***

## CL-13: Transaction Reporting (Batch Leaf Nodes)

**Programs:** CBTRN01C (validator/reporter), CBTRN03C (detail reporter)
**JCL:** TRANREPT

**Coupling analysis:**

* CBTRN01C: reads DALYTRAN + CARDXREF + ACCTFILE; produces report
* CBTRN03C: reads TRANSACT (sorted); produces formatted detail report
* Neither has incoming CALL dependencies — true leaf nodes

**Migration Strategy:**

* Replace with scheduled report jobs (BullMQ + a PDF library such as PDFKit or Puppeteer)
* Or on-demand GraphQL queries with pagination

***

## CL-14: Data Readers (Batch Leaf Nodes)

**Programs:** CBACT01C, CBACT02C, CBACT03C, CBCUS01C
**JCL:** READACCT, READCARD, READXREF, READCUST

**Purpose:** Read-only VSAM dump programs for debugging/reporting.

**Migration Notes:**

* These are the simplest programs in the codebase.
* Easily replaced by SQL SELECT queries + CSV export.
* CBACT01C additionally calls COBDATFT assembler routine for date formatting.

***

## CL-15: DB2 Transaction Type Management (Variant)

**Programs:** COTRTLIC, COTRTUPC (CICS), COBTUPDT (Batch)
**Variant:** `app-transaction-type-db2`
**DB2 Tables:** TRAN\_TYPE, TRAN\_CATEGORY

**Coupling analysis:**

* COTRTLIC ↔ COTRTUPC: bidirectional XCTL (SCC)
* COBTUPDT: standalone batch update — no incoming dependencies
* These are optional modules; main app works without them (admin menu shows options only if installed)

**Migration Strategy:**

* PostgreSQL tables: `transaction_types`, `transaction_categories`
* Replace DB2 SQL with PostgreSQL equivalents (cursors → prepared statements with pagination)

***

## CL-16: IMS Authorization (Variant — Highest Complexity)

**Programs:** CBPAUP0C (batch), COPAUA0C, COPAUS0C, COPAUS1C, COPAUS2C (CICS)
**Variant:** `app-authorization-ims-db2-mq`
**DB:** IMS DL/I via CBLTDLI
**Also:** DBUNLDGS, PAUDBLOD, PAUDBUNL (DB2/IMS data tools)

**Coupling analysis:**

* All 5 authorization programs call CBLTDLI — tightly bound to IMS DL/I
* No source for IMS DBD/PSB (database/program spec blocks) in this repo
* COPAUS0C appears in COMEN01C's menu with runtime EXEC CICS INQUIRE guard
* DBUNLDGS + PAUDBLOD form an IMS↔DB2 data pipeline

**Migration Risk:** VERY HIGH — IMS DL/I hierarchical database has no direct relational equivalent.

**Migration Strategy:**

* Map IMS DBD hierarchy to PostgreSQL table(s) for authorization records
* Replace CBLTDLI calls with TypeORM repository queries against the migrated PostgreSQL schema
* Requires IMS schema documentation (not in this codebase)

***

## CL-17: Utilities (True Leaf Nodes)

**Programs:** CSUTLDTC, COBSWAIT, COBDATFT

| Program | Purpose | Callers | Migration |
|---------|---------|---------|-----------|
| CSUTLDTC | Date validation (wraps IBM LE CEEDAYS) | COTRN02C, CORPT00C | TypeScript date-fns `parseISO()` + validator |
| COBSWAIT | Timed wait (wraps MVS STIMER) | WAITSTEP JCL | `await Bun.sleep(...)` or remove |
| COBDATFT | Date formatter (assembler) | CBACT01C | TypeScript date-fns `format()` |

***

## Isolated Modules (Single-Owner Files)

| File | Sole Batch Owner | CICS Owner | Notes |
|------|-----------------|-----------|-------|
| DISCGRP | CBACT04C (READ) | None | Internal rate table — consider moving to DB |
| USRSEC | None | COSGN00C, COUSR0x | Authentication file — replace with DB users table |
| DALYTRAN | CBTRN01C, CBTRN02C | None | External input — define as API/event source |

***

## Recommended Migration Sequence

| Phase | Clusters | Rationale |
|-------|---------|-----------|
| Phase 0 — Infrastructure | Schema, auth framework | PostgreSQL schema from data-model; JWT auth |
| Phase 1 — Batch Leaf Nodes | CL-14, CL-17 | Zero incoming deps; verify data access patterns |
| Phase 1b — Core Batch | CL-09, CL-10, CL-13, CL-11 | Transaction pipeline; tests validate correctness |
| Phase 2 — CICS Entry + Nav | CL-00, CL-01, CL-02 | Session + menu; establishes routing pattern |
| Phase 3 — CRUD Clusters | CL-03, CL-04, CL-05, CL-06, CL-07 | Core business functions; highest value |
| Phase 4 — Reporting + Tools | CL-08, CL-12, CL-15 | Batch bridge + variants |
| Phase 5 — IMS Variant | CL-16 | Requires IMS schema discovery first |
