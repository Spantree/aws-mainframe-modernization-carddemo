# Complexity Scoring — CardDemo Migration

**Generated:** 2026-02-28
**Programs scored:** 46 COBOL + 2 Assembler (flagged separately)
**Methodology:** 6-dimension scoring, 1–5 scale each

## Scoring Formula

```
Composite = (CF × 0.20) + (CC × 0.25) + (DC × 0.15) + (DB × 0.15) + (INT × 0.15) + (BC × 0.10)
```

| Dimension | Weight | Description |
|---|---|---|
| CF — Control Flow | 20% | GO TO count, ALTER, nesting depth, PERFORM THRU |
| CC — CICS Coupling | 25% | EXEC CICS variety, HANDLE CONDITION/AID, async START/RETRIEVE, BMS |
| DC — Data Complexity | 15% | REDEFINES, COMP-3, OCCURS DEPENDING ON, reference modification, POINTER |
| DB — Database | 15% | EXEC SQL count, cursors, dynamic SQL, table count |
| INT — Integration | 15% | Outgoing calls, MQ, shared files, assembler calls, IMS |
| BC — Business Criticality | 10% | Financial logic, regulatory, revenue-critical |

## Difficulty Bands

| Score | Difficulty | Strategy |
|---|---|---|
| 1.0–2.0 | **Easy** | Automated translation + light review |
| 2.0–3.0 | **Moderate** | AI-assisted translation + thorough testing |
| 3.0–4.0 | **Hard** | AI translation + manual refactoring + domain expert review |
| 4.0–5.0 | **Very Hard** | May need manual rewrite, wrapping, or phased approach |

---

## Summary

| Difficulty | Count | Programs |
|---|---|---|
| Easy (1.0–2.0) | 22 | COBTUPDT, CBACT02C, CBACT03C, CBCUS01C, PAUDBLOD, CSUTLDTC, CBTRN01C, CBTRN03C, DBUNLDGS, COBSWAIT, CBACT01C, CBACT04C, PAUDBUNL, CBEXPORT, COUSR01C–03C, COTRN01C, COMEN01C, COADM01C, CBTRN02C, CBIMPORT |
| Moderate (2.0–3.0) | 20 | COSGN00C, CBPAUP0C, COUSR00C, CBSTM03B, COTRTUPC, COPAUA0C–2C, COACTVWC, COTRN00C, CODATE01, COTRTLIC, COCRDSLC, COBIL00C, COTRN02C, COPAUS1C, COPAUS2C, COACCT01 |
| Hard (3.0–4.0) | 5 | COACTUPC, COCRDUPC, COCRDLIC, CBSTM03A, CORPT00C |
| Very Hard (4.0–5.0) | 0 | — |

**Assembler programs (manual reimplementation required):** COBDATFT, MVSWAIT

---

## Full Scores — Sorted by Composite Descending

### HARD Programs (3.0–4.0)

---

#### COACTUPC — Composite: **3.85** | Difficulty: **Hard**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 5 | 4 | 5 | 1 | 3 | 5 | **3.85** |

- **Type:** CICS Online (main app)
- **Lines:** 4,236 (largest program)
- **Control Flow (5):** 51 GO TO statements; 2 PERFORM THRU ranges. Spaghetti flow across 3,368 LOC.
- **CICS Coupling (4):** READ, REWRITE, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND, SYNCPOINT — 8 distinct command types. SYNCPOINT is a transactional commit boundary. DFHAID keyboard handling. Multiple COMMAREA usages.
- **Data Complexity (5):** 43 REDEFINES clauses; 4 COMP-3 items; 32 reference modification occurrences; 16 copybooks including CSLKPCDY (1,318-line US state/ZIP lookup table); CSSETATY used 39 times via COPY REPLACING to generate field-specific BMS attribute bytes.
- **Database (1):** No EXEC SQL. VSAM-only.
- **Integration (3):** XCTL to navigation hub; 3 VSAM files (ACCTFILE I-O, CUSTFILE I-O, CARDXREF INPUT).
- **Business Criticality (5):** Full account update with validation of all account master fields; SYNCPOINT confirms financial state change.
- **Key risks:** The COPY REPLACING×39 pattern generates thousands of lines at compile time. CSLKPCDY must become a database table or a TypeScript const map. The 43 REDEFINES require careful field mapping in the data model. Cannot be automated cleanly — requires manual refactoring.

---

#### COCRDUPC — Composite: **3.40** | Difficulty: **Hard**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 4 | 4 | 4 | 1 | 3 | 4 | **3.40** |

- **Type:** CICS Online (main app)
- **Lines:** 1,560
- **Control Flow (4):** 21 GO TO statements; 2 PERFORM THRU ranges. Cross-section jumps.
- **CICS Coupling (4):** READ, WRITE, REWRITE, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND — 8 commands.
- **Data Complexity (4):** 8 REDEFINES; 106 ref-mod/subscript patterns; 11 copybooks. Nested data structures across card + xref + account.
- **Integration (3):** 3 VSAM files (CARDFILE I-O, CARDXREF I-O, ACCTFILE INPUT).
- **Business Criticality (4):** Adds and modifies credit card records; writes to both CARDFILE and CARDXREF atomically.

---

#### COCRDLIC — Composite: **3.30** | Difficulty: **Hard**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 4 | 4 | 4 | 1 | 3 | 3 | **3.30** |

- **Type:** CICS Online (main app)
- **Lines:** 1,459
- **Control Flow (4):** 16 GO TO statements; PERFORM THRU ranges for browse loop handling.
- **CICS Coupling (4):** STARTBR, READNEXT, ENDBR, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND — 8 commands including full VSAM browse lifecycle.
- **Data Complexity (4):** 8 REDEFINES; 1 COMP-3; 129 ref-mod occurrences; 10 copybooks.
- **Integration (3):** VSAM browse across CARDXREF and CARDFILE.
- **Business Criticality (3):** Paginated card list display — standard CRUD.

---

#### CBSTM03A — Composite: **3.00** | Difficulty: **Hard**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 5 | 1 | 5 | 1 | 3 | 4 | **3.00** |

- **Type:** Batch (main app)
- **Lines:** 924
- **Control Flow (5):** **ALTER statements (4)** — dynamically reassigns GO TO targets at runtime. 15 GO TO statements + 2 PERFORM THRU. Spaghetti control flow; ALTER is a migration **blocker** pattern.
- **CICS Coupling (1):** No CICS — pure batch.
- **Data Complexity (5):** **POINTER usage (4 references)** — directly addresses PSA/TCB/TIOT system control blocks. 2D OCCURS arrays for table formatting. 4 copybooks. Low-level mainframe memory manipulation with no TypeScript equivalent.
- **Integration (3):** Calls CBSTM03B (file I/O dispatcher); writes statement to both text and HTML output files.
- **Business Criticality (4):** Generates account statements (financial documents delivered to customers).
- **Key risks:** ALTER/GO TO is the most feared COBOL anti-pattern. POINTER arithmetic against MVS control blocks (PSA/TCB/TIOT) has no portable equivalent — this logic must be identified, understood, and completely rewritten. The HTML generation in COBOL is unusual and requires careful reverse-engineering.

---

#### CORPT00C — Composite: **3.00** | Difficulty: **Hard**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 2 | 5 | 3 | 1 | 3 | 3 | **3.00** |

- **Type:** CICS Online (main app)
- **Lines:** 649
- **Control Flow (2):** 1 GO TO; mostly structured.
- **CICS Coupling (5):** Uses **EXEC CICS START** to asynchronously initiate a batch transaction from online. This bridges the online/batch boundary — a pattern with no direct NestJS equivalent without an async job framework. START + RETURN = fire-and-forget scheduling.
- **Data Complexity (3):** CSUTLDPY (375-line date procedure copybook), 9 copybooks total.
- **Integration (3):** Calls CSUTLDTC for date validation; CICS START triggers batch jobs.
- **Business Criticality (3):** Initiates regulatory/billing reports from online screens.
- **Key risks:** The CICS START pattern requires a message queue or job scheduler (e.g., BullMQ + Kafka/RabbitMQ, or AWS Batch) to replace. The coupling between CORPT00C and the batch programs it triggers must be preserved through an async boundary.

---

### MODERATE Programs (2.0–3.0)

---

#### COBIL00C — Composite: **2.90**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 4 | 3 | 1 | 4 | 5 | **2.90** |

- **Type:** CICS Online (main app) — Transaction ID: CB00
- **Lines:** 572
- **CICS Coupling (4):** READ, REWRITE, WRITE, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND, ASKTIME, FORMATTIME — 10 distinct commands.
- **Integration (4):** Accesses TRANSACT-VSAM (write), ACCTDAT-VSAM (I-O), and **CXACAIX-VSAM via alternate index** — VSAM KSDS alternate index path requires special handling in the TypeORM layer (compound key lookup).
- **Business Criticality (5):** Bill payment — posts a payment transaction and updates account balance. Revenue-critical, ACID semantics required.

---

#### COTRN02C — Composite: **2.90**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 4 | 4 | 1 | 3 | 5 | **2.90** |

- **Type:** CICS Online (main app)
- **Lines:** 783
- **CICS Coupling (4):** READ, WRITE, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND, ASKTIME, FORMATTIME — 9 commands.
- **Data Complexity (4):** 15 reference modifications; 26 EVALUATE blocks; CSUTLDPY+CSUTLDWY date utility copybooks (464 lines of inline procedures).
- **Business Criticality (5):** Creates new transaction records — financial transaction creation with validation.

---

#### COCRDSLC — Composite: **2.80**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 3 | 4 | 3 | 1 | 2 | 3 | **2.80** |

- **Type:** CICS Online (main app)
- **Lines:** 887
- **Control Flow (3):** 9 GO TO; 1 PERFORM THRU.
- **CICS Coupling (4):** READ, STARTBR, READNEXT, ENDBR, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND — 9 commands with VSAM browse.
- **Data Complexity (3):** 6 REDEFINES; 56 subscript patterns.

---

#### COPAUS1C — Composite: **2.80**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 3 | 1 | 5 | 5 | **2.80** |

- **Type:** CICS Online IMS (authorization-ims-db2-mq variant)
- **Lines:** 604
- **Integration (5):** IMS DL/I access via CBLTDLI call interface; CICS XCTL navigation.
- **Data Complexity (3):** OCCURS DEPENDING ON (variable-length DFHCOMMAREA).
- **Business Criticality (5):** Payment authorization variant 1 — authorization setup flow.

---

#### COPAUS2C — Composite: **2.80**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 2 | 5 | 5 | **2.80** |

- **Type:** CICS Online IMS (authorization-ims-db2-mq variant)
- **Lines:** 244
- **Integration (5):** IMS DL/I via CBLTDLI.
- **Database (2):** 4 EXEC SQL statements — **inventory undercounted**; mixed IMS+DB2 access pattern in single program.
- **Business Criticality (5):** Authorization confirmation/completion screen.

---

#### COACCT01 — Composite: **2.80**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 4 | 2 | 1 | 5 | 4 | **2.80** |

- **Type:** CICS Online MQ (vsam-mq variant)
- **Lines:** 620
- **CICS Coupling (4):** Includes IBM MQ PUT command.
- **Integration (5):** Dual-write: VSAM read + IBM MQ event publish.
- **Business Criticality (4):** Account inquiry with event publishing — must preserve MQ message contract in the TypeScript/NestJS migration.

---

#### COACTVWC — Composite: **2.70**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 3 | 3 | 3 | 1 | 3 | 3 | **2.70** |

- **Type:** CICS Online (main app)
- **Lines:** 941
- **Control Flow (3):** 9 GO TO; 1 PERFORM THRU.
- **Data Complexity (3):** 2 REDEFINES; 14 copybooks; 63 subscript occurrences.
- **Note:** Read-only view of COACTUPC's data — migrate together as pair.

---

#### COPAUA0C — Composite: **2.65**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 5 | 5 | **2.65** |

- **Type:** CICS Online IMS (authorization-ims-db2-mq variant)
- **Lines:** 1,026
- **Integration (5):** IMS DL/I via CBLTDLI from CICS context.
- **Business Criticality (5):** Payment authorization inquiry — primary authorization read screen.

---

#### COPAUS0C — Composite: **2.65**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 5 | 5 | **2.65** |

- **Type:** CICS Online IMS (authorization-ims-db2-mq variant)
- **Lines:** 1,032
- **Integration (5):** IMS DL/I via CBLTDLI from CICS context.
- **Business Criticality (5):** Payment authorization setup management.

---

#### CODATE01 — Composite: **2.45**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 5 | 1 | 1 | 4 | 1 | **2.45** |

- **Type:** CICS Online MQ (vsam-mq variant)
- **Lines:** 524
- **CICS Coupling (5):** Uses CICS START + RETRIEVE — asynchronous task scheduling pattern. The started task receives its request via RETRIEVE from CICS interval control. No direct NestJS equivalent without a job queue or Kafka/RabbitMQ.
- **Integration (4):** CICS async task + MQ.

---

#### COTRTLIC — Composite: **2.45**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 3 | 3 | 3 | **2.45** |

- **Type:** CICS Online DB2 (transaction-type-db2 variant)
- **Lines:** 2,098
- **Database (3):** 16 EXEC SQL statements; DECLARE CURSOR / OPEN / FETCH / CLOSE loop.
- **Note:** Despite large LOC (2,098), most code is UI formatting. The DB2 cursor maps cleanly to TypeORM streaming queries (`createQueryBuilder().stream()`).

---

#### COTRN00C — Composite: **2.40**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 4 | 3 | 1 | 2 | 3 | **2.40** |

- **Type:** CICS Online (main app)
- **Lines:** 699
- **CICS Coupling (4):** Bidirectional VSAM browse — STARTBR, READNEXT, **READPREV** (scroll both directions), ENDBR — 9 distinct CICS commands.

---

#### CBSTM03B — Composite: **2.30**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 4 | 1 | 3 | 1 | 3 | 2 | **2.30** |

- **Type:** Called Subprogram (main app)
- **Lines:** 230
- **Control Flow (4):** 13 GO TO statements; 4 PERFORM THRU ranges. State-machine dispatch pattern.
- **Note:** Tightly coupled to CBSTM03A — migrate as a unit. The 4 PERFORM THRU ranges make paragraph extraction difficult.

---

#### COTRTUPC — Composite: **2.30**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 2 | 3 | 3 | **2.30** |

- **Type:** CICS Online DB2 (transaction-type-db2 variant)
- **Lines:** 1,702
- **Database (2):** 7 EXEC SQL (SELECT/INSERT/UPDATE/DELETE) — full CRUD via CICS.

---

#### COUSR00C — Composite: **2.25**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 4 | 2 | 1 | 2 | 3 | **2.25** |

- **Type:** CICS Online (main app)
- **Lines:** 695
- **CICS Coupling (4):** STARTBR/READNEXT/ENDBR VSAM browse; 8 distinct commands.

---

#### CBPAUP0C — Composite: **2.15**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 1 | 5 | 5 | **2.15** |

- **Type:** Batch IMS (authorization-ims-db2-mq variant)
- **Lines:** 386
- **Integration (5):** IMS DL/I via CBLTDLI — batch program driving IMS database.
- **Business Criticality (5):** Payment authorization batch processing — coordinates authorization workflow.

---

#### COSGN00C — Composite: **2.10**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 4 | **2.10** |

- **Type:** CICS Online (main app)
- **Lines:** 260
- **Business Criticality (4):** Application-level authentication — credentials validated against USRSEC VSAM. No RACF. Security boundary must be replaced with a proper auth framework (e.g., NestJS Guards + Passport JWT).

---

#### CBIMPORT — Composite: **2.10**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 4 | 1 | 4 | 3 | **2.10** |

- **Type:** Batch (main app)
- **Lines:** 487
- **Data Complexity (4):** 10 reference modifications; multi-record type dispatching (C/A/X/T/D discriminator); CVEXPORT complex union layout.
- **Integration (4):** 7 file declarations — 1 input splits to 5 VSAM targets + 1 error file.

---

#### CBTRN02C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 3 | 5 | **2.00** |

- **Type:** Batch (main app)
- **Lines:** 731
- **Business Criticality (5):** Posts daily transactions — updates account balances in ACCTFILE and writes to TRANSACT-VSAM. Revenue-critical batch job requiring ACID semantics (TypeORM `dataSource.transaction(...)`).

---

#### COADM01C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 3 | **2.00** |

- **Type:** CICS Online (main app)
- **Lines:** 288
- Admin menu entry point (Transaction ID: CA00); XCTL navigation hub.

---

#### COMEN01C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 3 | **2.00** |

- **Type:** CICS Online (main app)
- **Lines:** 308
- Main menu entry point for regular users; XCTL navigation hub.

---

#### COTRN01C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 3 | **2.00** |

- **Type:** CICS Online (main app)
- **Lines:** 330
- Transaction detail view — CICS READ + SEND MAP pattern.

---

#### COUSR01C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 3 | **2.00** |

- **Type:** CICS Online (main app)
- **Lines:** 299
- User security record view — CICS READ + SEND MAP pattern.

---

#### COUSR02C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 3 | **2.00** |

- **Type:** CICS Online (main app)
- **Lines:** 414
- User security record creation — CICS WRITE path.

---

#### COUSR03C — Composite: **2.00**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 3 | 2 | 1 | 2 | 3 | **2.00** |

- **Type:** CICS Online (main app)
- **Lines:** 359
- User security record deletion — CICS DELETE path.

---

### EASY Programs (1.0–2.0)

---

#### CBEXPORT — Composite: **1.95**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 4 | 3 | **1.95** |

- **Type:** Batch (main app) — Lines: 582
- Exports all entities to a single multi-record migration file; 6 VSAM inputs.

---

#### CBACT04C — Composite: **1.85**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 2 | 5 | **1.85** |

- **Type:** Batch (main app) — Lines: 652
- **Business Criticality (5):** Interest calculation — applies discount-group rates to account balances. Financial mutation requiring exact decimal arithmetic (Decimal.js in TypeScript).

---

#### CBACT01C — Composite: **1.85**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 1 | 5 | 2 | **1.85** |

- **Type:** Batch (main app) — Lines: 430
- **Integration (5):** Calls COBDATFT assembler program. Blocked until COBDATFT is reimplemented.

---

#### PAUDBUNL — Composite: **1.80**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 1 | 5 | 3 | **1.80** |

- **Type:** Batch IMS (authorization-ims-db2-mq variant) — Lines: 317
- IMS DL/I extract utility via CBLTDLI; simple sequential output.

---

#### COBSWAIT — Composite: **1.60**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 1 | 5 | 1 | **1.60** |

- **Type:** Batch (main app) — Lines: 41
- **Integration (5):** Calls MVSWAIT assembler. Replace both with Thread.sleep().

---

#### CBTRN01C — Composite: **1.55**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 2 | 2 | **1.55** |

- **Type:** Batch (main app) — Lines: 494
- Daily transaction report — read-only, no data mutation.

---

#### CBTRN03C — Composite: **1.55**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 2 | 2 | **1.55** |

- **Type:** Batch (main app) — Lines: 649
- Transaction detail report — read-only, report output.

---

#### DBUNLDGS — Composite: **1.55**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 3 | 2 | 2 | **1.55** |

- **Type:** Batch DB2 (authorization-ims-db2-mq variant) — Lines: 366
- DB2 cursor unload — extract-only utility.

---

#### CSUTLDTC — Composite: **1.45**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 2 | 1 | **1.45** |

- **Type:** Called Subprogram (main app) — Lines: 157
- Date validation wrapper around IBM LE CEEDAYS. Replace with date-fns `parseISO()` / `Temporal.PlainDate`.

---

#### CBACT02C — Composite: **1.40**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 1 | 2 | 2 | **1.40** |

- **Type:** Batch (main app) — Lines: 178
- Reads CARDFILE VSAM, prints records.

---

#### CBACT03C — Composite: **1.40**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 1 | 2 | 2 | **1.40** |

- **Type:** Batch (main app) — Lines: 178
- Reads CARDXREF VSAM, prints records.

---

#### CBCUS01C — Composite: **1.40**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 1 | 2 | 2 | **1.40** |

- **Type:** Batch (main app) — Lines: 178
- Reads CUSTFILE VSAM, prints records.

---

#### PAUDBLOD — Composite: **1.40**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 2 | 2 | 2 | **1.40** |

- **Type:** Batch DB2 (authorization-ims-db2-mq variant) — Lines: 369
- DB2 bulk load from sequential file — INSERT + COMMIT/ROLLBACK.

---

#### COBTUPDT — Composite: **1.35**

| CF | CC | DC | DB | INT | BC | Composite |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 2 | 1 | 3 | **1.35** |

- **Type:** Batch DB2 (transaction-type-db2 variant) — Lines: 237
- Simplest program scored. Bulk DB2 UPDATE with COMMIT/ROLLBACK.

---

## Assembler Programs — Manual Reimplementation Required

These two programs are written in IBM Assembler and cannot be automatically translated.

| Program | Lines | Called By | Replacement |
|---|---|---|---|
| COBDATFT | 84 | CBACT01C | TypeScript date formatter (date-fns / `Temporal.PlainDate`) |
| MVSWAIT | 30 | COBSWAIT | `await Bun.sleep(centiseconds * 10)` |

Both replacements are trivial once the TypeScript/NestJS layer is established. However, **CBACT01C and COBSWAIT are blocked** until their assembler dependencies are resolved.

---

## Dimension Score Patterns

| Pattern | Programs Affected |
|---|---|
| ALTER statements | CBSTM03A only |
| POINTER usage | CBSTM03A only |
| >10 GO TO | COACTUPC (51), COCRDUPC (21), COCRDLIC (16), CBSTM03A (15), CBSTM03B (13) |
| CICS START async | CORPT00C, CODATE01 |
| IMS DL/I | CBPAUP0C, COPAUA0C, COPAUS0C, COPAUS1C, COPAUS2C, PAUDBUNL |
| MQ integration | COACCT01, CODATE01 |
| DB2 cursors | COTRTLIC, DBUNLDGS |
| Mixed IMS+DB2 | COPAUS2C |
| Assembler calls | CBACT01C (→COBDATFT), COBSWAIT (→MVSWAIT) |
| VSAM browse (STARTBR) | COCRDLIC, COCRDSLC, COTRN00C, COUSR00C, CBPAUP0C |
| VSAM alt-index | COBIL00C (CXACAIX) |
