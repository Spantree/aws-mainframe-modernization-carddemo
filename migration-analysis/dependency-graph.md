# CardDemo Dependency Graph — Full Cross-Reference Report

**Generated:** 2026-02-28
**Source:** `app/` (31 core programs, 13 variant programs, 30 copybooks, 17 BMS mapsets, 38 JCL jobs)
**Authority:** CARDDEMO.CSD (authoritative CICS resource definitions)

---

## 1. Graph Statistics

| Node Type | Count |
|-----------|------:|
| COBOL Programs (core) | 31 |
| COBOL Programs (variants) | 13 |
| Assembler Programs | 2 |
| Copybooks | 30 |
| VSAM Files | 9 |
| BMS Mapsets | 17 |
| CICS Transactions | 17 |
| DB2 Tables | 2 |
| IMS DL/I Databases | 1 |
| JCL Jobs | 38 |
| **Total Nodes** | **~160** |

| Edge Type | Count |
|-----------|------:|
| CALLS (static CALL) | 17 |
| CALLS (via IMS CBLTDLI) | 6 |
| TRANSFERS_TO (CICS XCTL — static) | 15 |
| TRANSFERS_TO (CICS XCTL — dynamic, resolved) | 17 |
| INCLUDES (COPY) | ~150 |
| READS (file/DB2) | ~45 |
| WRITES (file/DB2) | ~20 |
| UPDATES (file/DB2) | ~18 |
| DELETES (file/DB2) | 4 |
| SENDS (BMS map) | 17 |
| RECEIVES (BMS map) | 17 |
| EXECUTES (JCL→program) | ~25 |
| INVOKES (transaction→program) | 17 |
| **Total Edges** | **~350** |

---

## 2. CSD Transaction-to-Program Mapping (Authoritative)

Source: `app/csd/CARDDEMO.CSD` — all entries are STATUS(ENABLED).

| Transaction ID | Program | Description |
|---------------|---------|-------------|
| CC00 | COSGN00C | Signon/login — application entry point |
| CM00 | COMEN01C | Main menu (regular users) |
| CA00 | COADM01C | Admin menu (admin users) |
| CB00 | COBIL00C | Bill payment |
| CAUP | COACTUPC | Account update |
| CAVW | COACTVWC | Account view |
| CCLI | COCRDLIC | Credit card list |
| CCDL | COCRDSLC | Credit card detail/select |
| CCUP | COCRDUPC | Credit card update |
| CT00 | COTRN00C | Transaction list |
| CT01 | COTRN01C | Transaction view |
| CT02 | COTRN02C | Transaction add |
| CR00 | CORPT00C | Report menu |
| CU00 | COUSR00C | User list (admin only) |
| CU01 | COUSR01C | User view |
| CU02 | COUSR02C | User add |
| CU03 | COUSR03C | User delete |
| CDV1 | COCRDSEC | Developer transaction (**source not found — orphan CSD entry**) |

**CSD Files registered:**

| CSD File Name | Dataset | Notes |
|--------------|---------|-------|
| ACCTDAT | AWS.M2.CARDDEMO.ACCTDATA.VSAM.KSDS | Account master |
| CARDDAT | AWS.M2.CARDDEMO.CARDDATA.VSAM.KSDS | Card master |
| CARDAIX | AWS.M2.CARDDEMO.CARDDATA.VSAM.AIX.PATH | Card alternate index |
| CCXREF | AWS.M2.CARDDEMO.CARDXREF.VSAM.KSDS | Card-account cross-reference |
| CUSTDAT | AWS.M2.CARDDEMO.CUSTDATA.VSAM.KSDS | Customer master |
| CXACAIX | AWS.M2.CARDDEMO.CARDXREF.VSAM.AIX.PATH | Xref alternate index (acct key) |
| TRANSACT | AWS.M2.CARDDEMO.TRANSACT.VSAM.KSDS | Transaction master |
| USRSEC | AWS.M2.CARDDEMO.USRSEC.VSAM.KSDS | User security |

**CSD TD Queue registered:**

| Queue Name | Type | DD | Purpose |
|-----------|------|----|---------|
| JOBS | Extra (output) | INREADER | Submit batch jobs from CICS (internal reader) |

---

## 3. Static Program Calls

### 3.1 COBOL-to-COBOL Static CALL

| Caller | Called | Interface |
|--------|--------|-----------|
| CBACT01C | COBDATFT | Date formatter (assembler) — formats mainframe internal date |
| CBACT01C | CEE3ABD | IBM LE abnormal termination handler |
| CBACT02C | CEE3ABD | IBM LE abnormal termination handler |
| CBACT03C | CEE3ABD | IBM LE abnormal termination handler |
| CBACT04C | CEE3ABD | IBM LE abnormal termination handler |
| CBCUS01C | CEE3ABD | IBM LE abnormal termination handler |
| CBEXPORT | CEE3ABD | IBM LE abnormal termination handler |
| CBIMPORT | CEE3ABD | IBM LE abnormal termination handler |
| CBTRN01C | CEE3ABD | IBM LE abnormal termination handler |
| CBTRN02C | CEE3ABD | IBM LE abnormal termination handler |
| CBTRN03C | CEE3ABD | IBM LE abnormal termination handler |
| COBSWAIT | MVSWAIT | MVS wait assembler routine |
| CBSTM03A | CBSTM03B | File I/O subprogram — all 4 statement input files |
| CBSTM03A | CEE3ABD | IBM LE abnormal termination handler |
| COTRN02C | CSUTLDTC | Date validation utility |
| CORPT00C | CSUTLDTC | Date validation utility |
| CSUTLDTC | CEEDAYS | IBM LE date-to-Lilian conversion API |
| COBTUPDT | CEE3ABD | IBM LE abnormal termination handler (DB2 variant) |
| DBUNLDGS | CEE3ABD | IBM LE abnormal termination handler (DB2 variant) |
| PAUDBLOD | CEE3ABD | IBM LE abnormal termination handler (DB2 variant) |
| PAUDBUNL | CEE3ABD | IBM LE abnormal termination handler (IMS variant) |

### 3.2 IMS DL/I Calls (via CBLTDLI interface)

| Caller | Called | Variant |
|--------|--------|---------|
| CBPAUP0C | CBLTDLI | authorization-ims-db2-mq — batch authorization |
| COPAUA0C | CBLTDLI | authorization-ims-db2-mq — CICS auth inquiry |
| COPAUS0C | CBLTDLI | authorization-ims-db2-mq — CICS auth setup |
| COPAUS1C | CBLTDLI | authorization-ims-db2-mq — CICS auth variant 1 |
| COPAUS2C | CBLTDLI | authorization-ims-db2-mq — CICS auth variant 2 |
| PAUDBUNL | CBLTDLI | authorization-ims-db2-mq — IMS unload |

---

## 4. CICS Program Navigation (XCTL)

### 4.1 Static XCTL (literal program names in code)

| From | To | Direction | Notes |
|------|----|-----------|-------|
| COSGN00C | COMEN01C | TRANSFERS_TO | Regular user → main menu |
| COSGN00C | COADM01C | TRANSFERS_TO | Admin user → admin menu |
| COADM01C | COSGN00C | TRANSFERS_TO | Logout / return to signon |
| COBIL00C | COTRN00C | TRANSFERS_TO | After payment → transaction list |
| COCRDLIC | COCRDUPC | TRANSFERS_TO | Card selected → card update |
| COCRDSLC | COCRDUPC | TRANSFERS_TO | Card selected → card update |
| COCRDUPC | COCRDSLC | TRANSFERS_TO | After update → card select |
| COACTUPC | COACTVWC | TRANSFERS_TO | After update → account view |
| COACTVWC | COACTUPC | TRANSFERS_TO | View → update |
| COTRN00C | COTRN01C | TRANSFERS_TO | List → view transaction detail |
| COTRN00C | COTRN02C | TRANSFERS_TO | List → add transaction |
| COTRN01C | COTRN00C | TRANSFERS_TO | Detail → back to list |
| COTRN02C | COTRN00C | TRANSFERS_TO | Add → back to list |
| COTRTLIC | COTRTUPC | TRANSFERS_TO | List → update type |
| COTRTUPC | COTRTLIC | TRANSFERS_TO | Update → back to list |

### 4.2 Dynamic XCTL — Resolved from Table Data

**COMEN01C** (main menu, CDEMO-MENU-OPT-PGMNAME from COMEN02Y):

| Option | Program | Description |
|--------|---------|-------------|
| 1 | COACTVWC | Account View |
| 2 | COACTUPC | Account Update |
| 3 | COCRDLIC | Credit Card List |
| 4 | COCRDSLC | Credit Card View |
| 5 | COCRDUPC | Credit Card Update |
| 6 | COTRN00C | Transaction List |
| 7 | COTRN01C | Transaction View |
| 8 | COTRN02C | Transaction Add |
| 9 | CORPT00C | Transaction Reports |
| 10 | COBIL00C | Bill Payment |
| 11 | COPAUS0C | Pending Authorization View (IMS variant — runtime check) |

**COADM01C** (admin menu, CDEMO-ADMIN-OPT-PGMNAME from COADM02Y):

| Option | Program | Description |
|--------|---------|-------------|
| 1 | COUSR00C | User List |
| 2 | COUSR01C | User Add |
| 3 | COUSR02C | User Update |
| 4 | COUSR03C | User Delete |
| 5 | COTRTLIC | Transaction Type List/Update (DB2 variant) |
| 6 | COTRTUPC | Transaction Type Maintenance (DB2 variant) |

**Note on COPAUS0C:** COMEN01C performs EXEC CICS INQUIRE PROGRAM before routing — if the IMS variant is not installed, it shows "Not available" rather than abending. This is a runtime feature flag.

### 4.3 Strongly Connected Components (Cycles)

These bidirectional XCTL pairs form tightly coupled units that must be migrated together:

| SCC | Programs | Coupling Type |
|-----|---------|---------------|
| SCC-1 | {COACTUPC, COACTVWC} | Bidirectional XCTL + shared files (ACCTDAT, CUSTDAT, CARDDAT/CCXREF) |
| SCC-2 | {COCRDSLC, COCRDUPC} | Bidirectional XCTL + shared file (CARDDAT) |
| SCC-3 | {COTRN00C, COTRN01C} | COTRN00C→COTRN01C→COTRN00C |
| SCC-4 | {COTRN00C, COTRN02C} | COTRN00C→COTRN02C→COTRN00C |
| SCC-5 | {COTRTLIC, COTRTUPC} | Bidirectional XCTL + DB2 table (DB2 variant only) |

**Combined SCC-3+4:** {COTRN00C, COTRN01C, COTRN02C} — transaction management cluster, all three must be migrated together.

---

## 5. Copybook Inclusions

### Top Copybooks by Consumer Count

| Copybook | Consumers | Purpose | Scope |
|----------|----------:|---------|-------|
| COCOM01Y | 26 | CICS DFHCOMMAREA layout | All CICS programs |
| DFHBMSCA | 19 | IBM BMS attribute definitions | All BMS programs |
| DFHAID | 19 | IBM attention identifier keys | All BMS programs |
| COTTL01Y | 18 | Screen title/header data | All core CICS |
| CSDAT01Y | 17 | Current date/time working storage | All core CICS |
| CSUSR01Y | 17 | Current user security context | All core CICS |
| CSMSG01Y | 17 | Screen message/error text | All core CICS |
| CVACT03Y | 15 | Card-xref record layout | Core + variants |
| CVACT01Y | 12 | Account master record layout | Core + variants |
| CVCUS01Y | 7 | Customer master record layout | Core + variants |
| CVTRA05Y | 10 | Transaction master record layout | Batch + online |
| CSUTLDPY | 4 | Date utility procedure paragraphs | Selected CICS |
| CVACT02Y | 5 | Card record layout | Selected programs |
| CVCRD01Y | 2 | Credit card display structures | COACTUPC, COACTVWC |
| CSMSG02Y | 2 | Secondary message definitions | COACTUPC, COACTVWC |

### Full Inclusion Matrix (selected programs)

| Program | Copybooks Included |
|---------|-------------------|
| COACTUPC | COCOM01Y, COACTUP(BMS), COTTL01Y, CSDAT01Y, CSMSG01Y, CSMSG02Y, CSUSR01Y, CVCRD01Y, CVACT01Y, CVACT03Y, CVCUS01Y, CSLKPCDY, CSSETATY, CSUTLDPY, DFHAID, DFHBMSCA |
| COACTVWC | COCOM01Y, COACTVW(BMS), COTTL01Y, CSDAT01Y, CSMSG01Y, CSMSG02Y, CSUSR01Y, CVCRD01Y, CVACT01Y, CVACT02Y, CVACT03Y, CVCUS01Y, CSUTLDPY, DFHAID, DFHBMSCA |
| CBACT04C | CVTRA01Y, CVACT03Y, CVTRA02Y, CVACT01Y, CVTRA05Y |
| CBTRN02C | CVTRA06Y, CVTRA05Y, CVACT03Y, CVACT01Y, CVTRA01Y |
| CBSTM03A | COSTM01, CVACT03Y, CUSTREC, CVACT01Y |
| COTRTLIC | COCOM01Y, COTTL01Y, CSDB2RWY(DB2), CSDB2RPY(DB2), DFHAID, DFHBMSCA |
| COTRTUPC | COCOM01Y, COTTL01Y, DCLTRTYP(DB2), DCLTRCAT(DB2), DFHAID, DFHBMSCA |

### Orphan Copybook

| Copybook | Consumers | Status |
|----------|----------:|--------|
| CSSTRPFY | 0 | **Dead code** — string parsing utility with no consumers |
| UNUSED1Y | 0 | **Dead code** — empty stub with no consumers |

---

## 6. VSAM File Access Matrix

### CICS Online File Access (via EXEC CICS commands)

| File (CSD Name) | Dataset | Programs — Read | Programs — Write | Programs — Rewrite | Programs — Delete | Programs — Browse |
|----------------|---------|-----------------|------------------|-------------------|------------------|------------------|
| ACCTDAT | ACCTDATA.VSAM.KSDS | COBIL00C, COACTVWC, COACTUPC | — | COBIL00C, COACTUPC | — | — |
| CARDDAT | CARDDATA.VSAM.KSDS | COACTVWC, COACTUPC, COCRDLIC | COCRDUPC | COACTUPC, COCRDUPC | — | — |
| CCXREF | CARDXREF.VSAM.KSDS | COCRDSLC, COCRDUPC | — | — | — | COCRDLIC |
| CXACAIX | CARDXREF.VSAM.AIX.PATH | COBIL00C | — | — | — | — |
| CUSTDAT | CUSTDATA.VSAM.KSDS | COACTVWC, COACTUPC | — | COACTUPC | — | — |
| TRANSACT | TRANSACT.VSAM.KSDS | COTRN01C, COTRN02C | COBIL00C, COTRN02C | — | — | COTRN00C |
| USRSEC | USRSEC.VSAM.KSDS | COSGN00C, COUSR01C, COUSR02C, COUSR03C | COUSR02C | — | COUSR03C | COUSR00C |

### Batch VSAM File Access (via COBOL file declarations)

| Dataset | Programs — INPUT | Programs — OUTPUT | Programs — I-O |
|---------|-----------------|------------------|---------------|
| ACCTFILE | CBACT01C, CBTRN01C, CBEXPORT | CBIMPORT | CBACT04C, CBTRN02C, COACTUPC* |
| CARDFILE | CBACT02C, COCRDLIC, CBEXPORT | CBIMPORT | COCRDUPC |
| CARDXREF | CBACT03C, CBACT04C, CBTRN01C, CBTRN02C, CBEXPORT | CBIMPORT | COACTUPC*, COCRDUPC |
| CUSTFILE | CBCUS01C, CBTRN01C, CBSTM03A†, CBEXPORT | CBIMPORT | COACTUPC* |
| TRANSACT | CBTRN03C, CBEXPORT | CBIMPORT | CBACT04C, CBTRN02C |
| USRSEC | — | — | COUSR02C*, COUSR03C* |
| DISCGRP | CBACT04C | — | — |
| DALYTRAN | CBTRN01C, CBTRN02C | — | — |

*CICS programs listed in DATA DIVISION declarations for CICS file control
†Via CBSTM03B subroutine

---

## 7. DB2 Table Access (Variant Modules)

| Program | Table | Operations | Variant |
|---------|-------|-----------|---------|
| COTRTLIC | TRAN-TYPE (DCLTRTYP) | SELECT, DECLARE CURSOR, OPEN, FETCH, CLOSE | transaction-type-db2 |
| COTRTUPC | TRAN-TYPE (DCLTRTYP) | SELECT, INSERT, UPDATE, DELETE | transaction-type-db2 |
| COTRTUPC | TRAN-CATEGORY (DCLTRCAT) | SELECT, INSERT | transaction-type-db2 |
| COBTUPDT | TRAN-TYPE | SELECT, UPDATE, COMMIT, ROLLBACK | transaction-type-db2 |
| DBUNLDGS | AUTH tables | DECLARE CURSOR, OPEN, FETCH, CLOSE, SELECT | authorization-ims-db2-mq |
| PAUDBLOD | AUTH tables | INSERT, COMMIT, ROLLBACK | authorization-ims-db2-mq |

---

## 8. BMS Map Associations

| Program | Mapset | Map Name | SEND | RECEIVE |
|---------|--------|----------|------|---------|
| COACTUPC | COACTUP | CACTUPA | YES | YES |
| COACTVWC | COACTVW | CACTVWA | YES | YES |
| COADM01C | COADM01 | COADM1A | YES | YES |
| COBIL00C | COBIL00 | CBIL0A | YES | YES |
| COCRDLIC | COCRDLI | CCRDLIA | YES | YES |
| COCRDSLC | COCRDSL | CCRDSLA | YES | YES |
| COCRDUPC | COCRDUP | CCRDUPA | YES | YES |
| COMEN01C | COMEN01 | CMEN01A | YES | YES |
| CORPT00C | CORPT00 | CRPT0A | YES | YES |
| COSGN00C | COSGN00 | CSGN0A | YES | YES |
| COTRN00C | COTRN00 | CTRN0A | YES | YES |
| COTRN01C | COTRN01 | CTRN1A | YES | YES |
| COTRN02C | COTRN02 | CTRN2A | YES | YES |
| COUSR00C | COUSR00 | CUSR0A | YES | YES |
| COUSR01C | COUSR01 | CUSR1A | YES | YES |
| COUSR02C | COUSR02 | CUSR2A | YES | YES |
| COUSR03C | COUSR03 | CUSR3A | YES | YES |

Additional variant BMS maps: COPAU00 (COPAUA0C), COPAU01 (COPAUS0C), COTRTLI (COTRTLIC), COTRTUP (COTRTUPC)

---

## 9. JCL Job-to-Program Execution

### Core Batch Jobs

| JCL Job | Programs Executed | Purpose |
|---------|------------------|---------|
| READACCT | CBACT01C | Read/export account VSAM file |
| READCARD | CBACT02C | Read/print card data |
| READCUST | CBCUS01C | Read/print customer data |
| READXREF | CBACT03C | Read/print card-account xref |
| POSTTRAN | CBTRN02C | Post daily transactions |
| INTCALC | CBACT04C | Calculate interest (PARM date) |
| TRANREPT | SORT, CBTRN03C | Sort + print transaction report |
| CREASTMT | SORT, CBSTM03A | Sort + generate account statements |
| COMBTRAN | SORT, IDCAMS | Combine + load transaction files |
| CBEXPORT | IDCAMS, CBEXPORT | Export all data to migration file |
| CBIMPORT | CBIMPORT | Import migration file to VSAM |
| WAITSTEP | COBSWAIT | Execute timed wait |
| CBADMCDJ | DFHCSDUP | Load CICS CSD resource definitions |
| MNTTRDB2 | COBTUPDT | Update DB2 transaction types (variant) |
| UNLDGSAM | DBUNLDGS | Unload authorization data (variant) |
| LOADPADB | PAUDBLOD | Load authorization DB2 data (variant) |
| UNLDPADB | PAUDBUNL | Unload authorization IMS data (variant) |

### VSAM Setup/Maintenance Jobs

| Job | Purpose |
|-----|---------|
| ACCTFILE | Define account KSDS |
| CARDFILE | Define card KSDS + alternate index |
| CUSTFILE | Define customer KSDS |
| XREFFILE | Define cardxref KSDS + alternate index |
| TRANFILE | Define transaction KSDS |
| DUSRSECJ | Define user security KSDS |
| DISCGRP | Define/load discount group file |
| TCATBALF | Define transaction category balance file |
| TRANCATG | Define transaction category file |
| TRANTYPE | Define transaction type file |
| TRANIDX | Build alternate index on TRANSACT |
| TRANBKP | IMS transaction backup |
| OPENFIL / CLOSEFIL | Open/close VSAM files for maintenance |

### GDG (Generation Data Group) Usage

| Dataset GDG | Direction | Jobs Involved |
|------------|-----------|---------------|
| DALYREJS(+1) | POSTTRAN writes | Daily transaction rejects |
| SYSTRAN(+1) | INTCALC writes | System-generated interest transactions |
| SYSTRAN(0) | COMBTRAN reads | Combines with TRANSACT.BKUP |
| TRANSACT.BKUP(+1) | TRANREPT writes via REPROC | Backup before sort/filter |
| TRANSACT.BKUP(0) | COMBTRAN reads | Base input for combine |
| TRANSACT.DALY(+1) | TRANREPT SORT writes | Date-filtered transactions |
| TRANSACT.COMBINED(+1) | COMBTRAN writes | Combined sorted output |
| TRANREPT(+1) | TRANREPT writes | Transaction report output |

---

## 10. Hub Node Analysis

### Hub Programs (high in-degree — many programs depend on them)

| Program | In-Degree (called/targeted by) | Type | Role |
|---------|--------------------------------:|------|------|
| COSGN00C | 2 (COADM01C, COMEN01C after logout) | CICS | Session boundary — all sessions enter here |
| CSUTLDTC | 2 (COTRN02C, CORPT00C) | Subprogram | Reusable date validator |
| CBSTM03B | 1 (CBSTM03A) | Subprogram | File I/O concentrator for statement gen |
| COTRN00C | 3 (COBIL00C, COTRN01C, COTRN02C) | CICS | Transaction list — central transaction hub |
| COCRDSLC | 2 (COCRDLIC, COCRDUPC via dynamic) | CICS | Card selection hub |

### Hub Programs (high out-degree — call/link to many)

| Program | Out-Degree | Targets |
|---------|----------:|---------|
| COMEN01C | 11 | Dynamic XCTL to 11 function programs |
| COADM01C | 7 | Dynamic XCTL to 6 admin programs + COSGN00C |
| COTRN00C | 2 | COTRN01C, COTRN02C |
| COUSR00C | 3 | COUSR01C, COUSR02C, COUSR03C |
| COACTUPC | 1 + file access | COACTVWC (XCTL) + 3 VSAM files |

### Hub Copybooks (highest change-impact)

| Copybook | Consumers | Change Impact |
|----------|----------:|---------------|
| COCOM01Y | 26 | **CRITICAL** — changing DFHCOMMAREA layout breaks all 26 CICS programs |
| DFHBMSCA / DFHAID | 19 | IBM-supplied — should not change; flag for migration |
| COTTL01Y | 18 | Screen title layout — moderate impact |
| CSDAT01Y | 17 | Date storage — touches all 17 core CICS programs |
| CSUSR01Y | 17 | User context — touches all 17 core CICS programs |
| CVACT01Y | 12 | Account record — core entity definition |
| CVACT03Y | 15 | Card-xref record — widest entity footprint |

---

## 11. Isolation Analysis — Leaf vs Hub Programs

### Leaf Programs (safest to migrate first — no callers in main app)

| Program | Type | Dependencies Out | Why Isolated |
|---------|------|-----------------|--------------|
| CBACT01C | Batch | COBDATFT, CEE3ABD | Only executed via READACCT JCL |
| CBACT02C | Batch | CEE3ABD | Only executed via READCARD JCL |
| CBACT03C | Batch | CEE3ABD | Only executed via READXREF JCL |
| CBCUS01C | Batch | CEE3ABD | Only executed via READCUST JCL |
| CBTRN03C | Batch | CEE3ABD | Only executed via TRANREPT JCL |
| COBSWAIT | Batch | MVSWAIT | Only executed via WAITSTEP JCL |
| CSUTLDTC | Subprog | CEEDAYS | Pure utility — no file access |

### Tightly Coupled Groups (must migrate together)

| Group | Programs | Coupling |
|-------|---------|---------|
| Account Management | COACTUPC, COACTVWC | Bidirectional XCTL, 3 shared VSAM files |
| Card Management | COCRDLIC, COCRDSLC, COCRDUPC | Circular XCTL, shared CARDDAT/CCXREF |
| Transaction Management | COTRN00C, COTRN01C, COTRN02C | Circular XCTL, shared TRANSACT file |
| User Management | COUSR00C, COUSR01C, COUSR02C, COUSR03C | One-way XCTL, shared USRSEC |
| Statement Generation | CBSTM03A, CBSTM03B | Direct CALL, shared 4 files |
| Transaction Posting | CBTRN02C (post) + CBACT04C (interest) | Shared TRANSACT + ACCTFILE via JCL pipeline |

---

## 12. Discovery Items / Gaps

| # | Item | Risk | Action |
|---|------|------|--------|
| 1 | COCRDSEC registered in CSD (CDV1 transaction) but source not in `app/` | HIGH | Locate source or confirm orphan |
| 2 | No RACF calls — authentication via USRSEC VSAM only | MED | Migrate user security model to database/JWT |
| 3 | CORPT00C uses EXEC CICS START + JOBS TD Queue (internal reader) to submit batch | HIGH | Redesign batch trigger mechanism |
| 4 | CSLKPCDY (1318-line lookup table — US states/zip codes) hardcoded | MED | Replace with database reference table |
| 5 | FTPJCL.JCL contains hardcoded FTP credentials (flagged in inventory) | CRITICAL | Remove before migration source exposure |
| 6 | GDG chaining creates implicit ordering: POSTTRAN→INTCALC→COMBTRAN→TRANREPT | HIGH | Enforce orchestration order in replacement scheduler |
| 7 | COPAUS0C dependency in COMEN01C guarded by EXEC CICS INQUIRE runtime check | MED | Test with IMS variant absent |
| 8 | CBSTM03A uses ALTER/GO TO control flow (15 GOTOs) | MED | Requires careful re-engineering of control flow |
| 9 | DFHBMSCA/DFHAID are IBM-supplied — no source available | LOW | Use JCICS or equivalent for Java migration |

---

*See also: `dependency-graph.mermaid`, `data-flow.mermaid`, `batch-flow.mermaid`, `clusters.md`, `hub-copybooks.md`*
