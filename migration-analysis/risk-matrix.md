# Risk Matrix — CardDemo Migration

**Generated:** 2026-02-28
**Scope:** Programs scoring ≥ 3.0 composite + special risk flags

> **Note:** No programs scored ≥ 4.0 composite (highest is COACTUPC at 3.85). This section covers all programs at ≥ 3.0 and selected programs with specific risk signals regardless of composite score.

---

## Programs Scoring ≥ 3.0 (Hard Tier)

### COACTUPC — Composite 3.85 | ⚠️ HIGHEST RISK

| Dimension | Score | Evidence |
|---|---|---|
| Control Flow | 5 | 51 GO TO statements; 2 PERFORM THRU; 4,236 lines |
| CICS Coupling | 4 | 8 distinct EXEC CICS commands; SYNCPOINT; HANDLE ABEND |
| Data Complexity | 5 | 43 REDEFINES; 32 reference modifications; CSLKPCDY 1,318-line lookup; CSSETATY×39 |
| Database | 1 | VSAM-only |
| Integration | 3 | 3 VSAM files; XCTL chains |
| Business Criticality | 5 | Account master update; SYNCPOINT financial commit |

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| 51 GO TO statements make control flow graph non-linear | Critical | Manual refactoring to structured methods before translation |
| CSSETATY COPY REPLACING×39 generates thousands of source lines at compile time | High | Reverse-engineer to React field-level validation state machine |
| CSLKPCDY 1,318-line US state/ZIP lookup table hardcoded in COBOL | High | Migrate to `reference_data` PostgreSQL table; load at startup |
| 43 REDEFINES — same memory area interpreted as different types | High | Map each REDEFINES to a TypeScript discriminated union / interface hierarchy |
| SYNCPOINT = distributed transaction commit | High | Wrap in TypeORM `dataSource.transaction(...)` + idempotency key |
| HANDLE ABEND — catch-all abend handler | Medium | Replace with a NestJS `@Catch()` exception filter |
| Largest program (4,236 lines) makes review and testing expensive | Medium | Decompose into multiple service methods before migration begins |

**Recommendation:** **Manual rewrite.** Automated COBOL-to-TypeScript translation will produce unmaintainable output for this program. Decompose into:
1. `AccountService.updateAccount()` — business logic + validation (NestJS provider)
2. `AccountController` — NestJS REST/GraphQL endpoint
3. React `AccountEditForm` — replaces BMS map + CSSETATY attribute logic
4. `StateZipReferenceService` — replaces CSLKPCDY lookup table

**Estimated effort:** 3–5 sprints (largest item in migration)

---

### COCRDUPC — Composite 3.40 | ⚠️ HIGH RISK

| Dimension | Score | Evidence |
|---|---|---|
| Control Flow | 4 | 21 GO TO statements; 2 PERFORM THRU |
| CICS Coupling | 4 | 8 distinct EXEC CICS commands; HANDLE ABEND |
| Data Complexity | 4 | 8 REDEFINES; 106 reference-modification/subscript occurrences; 11 copybooks |
| Integration | 3 | 3 VSAM files (CARDFILE I-O, CARDXREF I-O, ACCTFILE INPUT) |
| Business Criticality | 4 | Credit card add/modify; dual-file atomic write |

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| 21 GO TO across 1,560 lines requires full control flow trace | High | Create flowchart before migration; trace all exit paths |
| 8 REDEFINES — card record interpreted multiple ways | High | Map to a TypeScript discriminated union; verify with data-model.md |
| Dual-file write (CARDFILE + CARDXREF must stay in sync) | High | Single TypeORM `dataSource.transaction(...)` wrapping both `save()` calls |
| 106 subscript patterns — complex field access patterns | Medium | Convert to named accessor methods |

**Recommendation:** AI-assisted translation + manual refactoring. Migrate together with COCRDLIC (same data domain).

---

### COCRDLIC — Composite 3.30 | ⚠️ HIGH RISK

| Dimension | Score | Evidence |
|---|---|---|
| Control Flow | 4 | 16 GO TO statements; PERFORM THRU in browse loop |
| CICS Coupling | 4 | STARTBR/READNEXT/ENDBR browse lifecycle; HANDLE ABEND; 8 commands |
| Data Complexity | 4 | 8 REDEFINES; 129 occurrences; 1,459 lines |
| Integration | 3 | 2 VSAM files with browse access |
| Business Criticality | 3 | Card list display — standard CRUD |

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| VSAM STARTBR/READNEXT/ENDBR browse = cursor-based pagination | High | Replace with TypeORM keyset pagination (`take` + `where` on the cursor key) |
| 16 GO TO disrupts paragraph sequencing | Medium | Trace control flow; convert to named methods |
| 8 REDEFINES on card record | Medium | Reuse CardRecord class from COCRDUPC migration |

**Recommendation:** Migrate after COCRDUPC — shares data structures and browse patterns.

---

### CBSTM03A — Composite 3.00 | ⚠️ MIGRATION BLOCKER CANDIDATE

| Dimension | Score | Evidence |
|---|---|---|
| Control Flow | 5 | **4 ALTER statements**; 15 GO TO; 2 PERFORM THRU |
| CICS Coupling | 1 | No CICS |
| Data Complexity | 5 | **4 POINTER references** (PSA/TCB/TIOT control blocks); 2D OCCURS arrays |
| Integration | 3 | CBSTM03B subprogram; text + HTML dual output |
| Business Criticality | 4 | Account statements (financial customer documents) |

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| **ALTER statements** — dynamically reassigns GO TO targets at runtime | **Critical** | Must statically analyze all possible runtime paths; no auto-translation possible |
| **POINTER to PSA/TCB/TIOT** — mainframe OS control block addressing | **Critical** | Determine what data is accessed; replace with TypeScript alternatives or eliminate the need entirely |
| 2D OCCURS arrays for table formatting | High | Convert to a TypeScript 2D array (`number[][]` / `string[][]`) |
| HTML generation in COBOL | Medium | Replace with a TypeScript template engine (Handlebars / EJS / React server rendering) |
| Tightly coupled to CBSTM03B (I/O dispatcher) | Medium | Merge into one NestJS service; eliminate the subprogram boundary |

**Recommendation:** **Manual rewrite required.** This is the only program in the codebase using both ALTER and POINTER. The POINTER-based MVS control block access must be investigated — if it reads system timing data (STCK), replace with `Date.now()` / `performance.now()`. If it reads job/task metadata, determine if that data is needed in the TypeScript version.

**Special note:** CBSTM03A generates HTML. This is rare in COBOL. The HTML template logic should be extracted to a proper template engine, making the TypeScript replacement significantly simpler than the COBOL source.

---

### CORPT00C — Composite 3.00 | ⚠️ ARCHITECTURE RISK

| Dimension | Score | Evidence |
|---|---|---|
| Control Flow | 2 | 1 GO TO |
| CICS Coupling | 5 | **EXEC CICS START** (async batch initiation from online) |
| Data Complexity | 3 | CSUTLDPY 375-line inline procedure copybook |
| Integration | 3 | Calls CSUTLDTC; triggers batch jobs asynchronously |
| Business Criticality | 3 | Initiates billing/regulatory reports |

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| **CICS START** — fires a batch transaction from an online screen | **High** | Replace with a BullMQ producer triggered by a NestJS REST endpoint; use Kafka/RabbitMQ to decouple online from batch |
| CSUTLDPY inline procedure copybook (375 lines compiled inline) | High | Already migrated in Wave 0 as DateUtils; verify PERFORM targeting |
| CICS START → started transaction has no synchronous return path | Medium | Use an async job status polling endpoint in NestJS |
| Downstream batch jobs not visible in this program's scope | Medium | Dependency mapper output must identify all programs triggered by START |

**Recommendation:** The CICS START pattern represents an **architectural boundary** — online-to-batch async initiation. The TypeScript/NestJS replacement requires both a UI (POST /reports/initiate) and a batch job runner (BullMQ processor). Design the async boundary before implementing CORPT00C.

---

## Programs Below 3.0 with Specific Risk Flags

### CBTRN02C — Composite 2.00 | ⚠️ FINANCIAL CRITICAL

Despite a moderate composite score, CBTRN02C is **revenue-critical** (BC=5):

| Risk | Severity | Mitigation |
|---|---|---|
| Updates account balances — financial mutation | Critical | Require shadow run: mainframe + NestJS service produce identical ACCTFILE state |
| Rejects invalid transactions to REJECT-FILE | High | Rejection criteria must be fully documented and tested |
| No error recovery in COBOL (abend = rerun) | Medium | Implement an idempotent BullMQ job with restart capability |

### COBIL00C — Composite 2.90 | ⚠️ FINANCIAL CRITICAL + VSAM ALT-INDEX

| Risk | Severity | Mitigation |
|---|---|---|
| Bill payment — financial mutation (BC=5) | Critical | TypeORM `dataSource.transaction(...)` + idempotency key (prevent double-posting) |
| VSAM alternate index (CXACAIX) access by card number | High | Model as PostgreSQL composite key or secondary index; test lookup by card number |
| 10 CICS commands — complex screen lifecycle | Medium | Map each CICS verb to React form state transition |

### CBACT04C — Composite 1.85 | ⚠️ FINANCIAL ALGORITHM

| Risk | Severity | Mitigation |
|---|---|---|
| Interest calculation — must produce exact decimal results | Critical | Use `Decimal` (Decimal.js) throughout; validate against mainframe results on historical data |
| JCL PARM date (YYYYMMDDXX format) — proprietary format | Medium | Build parameter validation; document the 2-char suffix meaning |
| Applies rates from DISCGRP file per account type | Medium | DISCGRP file structure must be in schema.sql and populated before migration |

### COSGN00C — Composite 2.10 | ⚠️ SECURITY BOUNDARY

| Risk | Severity | Mitigation |
|---|---|---|
| Application-level auth vs VSAM (no RACF/SSO) | High | Replace with NestJS Guards + Passport JWT and bcrypt-hashed passwords in PostgreSQL |
| Passwords stored in VSAM — likely cleartext or simple encoding | High | Migrate with forced password reset OR hash during data migration |
| Session state passed via COMMAREA (no server-side session) | Medium | Replace COMMAREA with JWT claims |

### COACCT01 (vsam-mq variant) — Composite 2.80 | ⚠️ MQ CONTRACT

| Risk | Severity | Mitigation |
|---|---|---|
| IBM MQ PUT — publishes account inquiry events | High | Document MQ message format; preserve message schema via a NestJS microservice client (Kafka/RabbitMQ) |
| Downstream MQ consumers not in this codebase | High | Identify all MQ queue consumers before migrating |

### COPAUS0C / COPAUA0C / COPAUS1C / COPAUS2C / CBPAUP0C — IMS Programs

| Risk | Severity | Mitigation |
|---|---|---|
| IMS DL/I via CBLTDLI — proprietary IBM database interface | Critical | Cannot migrate COBOL without first migrating or replacing IMS database |
| COPAUS2C has EXEC SQL + IMS in same program | High | Mixed data source requires transactional coordination in the NestJS service |
| Authorization workflow must remain atomic | High | Implement Saga pattern or XA transaction if IMS data migrates to PostgreSQL |

**IMS migration prerequisite:** The IMS database schema must be reverse-engineered and migrated to PostgreSQL before any of the authorization programs (CBPAUP0C, COPAUA0C, COPAUS0C, COPAUS1C, COPAUS2C) can be migrated.

---

## Risk Summary Table

| Program | Composite | Primary Risk | Severity | Priority |
|---|---|---|---|---|
| COACTUPC | 3.85 | 51 GO TO + 43 REDEFINES + SYNCPOINT | Critical | Wave 8 — manual rewrite |
| CBSTM03A | 3.00 | ALTER statements + POINTER to OS control blocks | Critical | Wave 8 — manual rewrite |
| COCRDUPC | 3.40 | 21 GO TO + dual-file atomic write | High | Wave 8 |
| COCRDLIC | 3.30 | VSAM browse + 16 GO TO | High | Wave 8 |
| CORPT00C | 3.00 | CICS START async — architecture boundary | High | Wave 7 |
| COBIL00C | 2.90 | Financial payment + VSAM alt-index | High | Wave 7 |
| CBTRN02C | 2.00 | Revenue-critical transaction posting | High | Wave 3 (shadow run) |
| CBACT04C | 1.85 | Interest calculation — `Decimal` precision | High | Wave 3 (shadow run) |
| COSGN00C | 2.10 | Security boundary — cleartext VSAM passwords | High | Wave 5 |
| COPAU*C/CBPAUP0C | 2.15–2.80 | IMS DL/I — requires IMS migration first | High | Wave 6 (IMS prereq) |
| COACCT01 | 2.80 | MQ message contract — downstream consumers | Medium | Wave 6 |
| COTRN02C | 2.90 | Financial transaction creation | Medium | Wave 7 |

---

## Migration Blockers Summary

| Blocker | Blocks | Resolution |
|---|---|---|
| COBDATFT (Assembler) | CBACT01C | Reimplement as a TypeScript date formatter (date-fns / Temporal) |
| MVSWAIT (Assembler) | COBSWAIT | Replace with `await Bun.sleep(...)` |
| IMS database not migrated | CBPAUP0C, COPAUA0C, COPAUS0C, COPAUS1C, COPAUS2C, PAUDBUNL | Migrate IMS → PostgreSQL before Wave 6 IMS programs |
| CBSTM03B must migrate with CBSTM03A | CBSTM03A (Wave 8) | Merge both into one NestJS report service |
| CORPT00C async job framework | Downstream batch reports | Design async job boundary (BullMQ + Kafka/RabbitMQ) before Wave 7 |

---

## Data Risks

These risks arise from data encoding, format, and storage decisions in the COBOL system
that must be resolved during migration.

| Risk | Severity | Detail | Mitigation |
|---|---|---|---|
| EBCDIC → UTF-8 conversion scope | HIGH | All PIC X fields stored in IBM CP037 EBCDIC. Sort order differs (EBCDIC lowercase sorts before uppercase). Any SQL ORDER BY or TypeScript comparison on character fields may produce different results. | Convert all PIC X fields during VSAM export; validate sort-sensitive queries against both orderings |
| Packed decimal (COMP-3) decoding | HIGH | COMP-3 fields store 2 decimal digits per byte + sign nibble. Incorrect decoding produces silent data corruption in financial totals. | Use validated COMP-3 decoder (see data-model.md); run spot-checks against known CVEXPORT reference data |
| COMP field range under TRUNC(STD) | MEDIUM | `PIC 9(9) COMP` max is 999,999,999 (not `Number.MAX_SAFE_INTEGER`). If TRUNC(BIN) was used instead, ranges differ. | Verify compile JCL for TRUNC option in every batch program; add range validation via class-validator (`@Min` / `@Max`) on DTOs |
| Plaintext passwords in USRSEC VSAM | **CRITICAL** | `SEC-USR-PWD PIC X(08)` stores passwords as 8-char plaintext strings. Migration must hash all passwords before writing to PostgreSQL. | Hash with bcrypt (cost ≥12) or Argon2id; consider forced password reset for all users |
| CVV persistence (PCI DSS 3.3) | **CRITICAL** | `CARD-CVV-CD PIC 9(03)` stored permanently in CARDFILE VSAM. Must NOT be migrated to PostgreSQL. | Exclude CARD-CVV-CD from migration ETL pipeline entirely; delete field from PostgreSQL schema |
| SSN as plain integer | HIGH | `CUST-SSN PIC 9(09)` stored as integer — no encryption, leading zeros lost. | Encrypt at column level (pgcrypto) or tokenize; restore leading zeros before encryption |
| Date field ambiguity in CBACT04C PARM | MEDIUM | INTCALC JCL passes date as YYYYMMDDXX (10-char with 2-char suffix). Suffix meaning not documented. | Reverse-engineer suffix from CBACT04C source code; document before migrating |
| OCCURS DEPENDING ON (variable-length COMMAREA) | LOW | COPAUS1C uses OCCURS DEPENDING ON for variable-length DFHCOMMAREA. The TypeScript equivalent needs dynamic array handling. | Use `T[]` (TypeScript array) with class-validator `@ArrayMaxSize` enforcement; test with boundary-size COMMAREA |
| Duplicate copybook CUSTREC vs CVCUS01Y | LOW | Two copybooks define CUSTOMER-RECORD with minor field name difference (`CUST-DOB-YYYYMMDD` vs `CUST-DOB-YYYY-MM-DD`). | Use CVCUS01Y as canonical; confirm field values are identical before discarding CUSTREC |

---

## Integration Risks

These risks arise from dependencies between programs, external systems, and batch pipeline
ordering that are not visible within individual program source files.

| Risk | Severity | Detail | Mitigation |
|---|---|---|---|
| GDG ordering not enforced in code | HIGH | Batch pipeline POSTTRAN→INTCALC→COMBTRAN→TRANREPT must execute in order; order is enforced by GDG generation numbers. No code enforces this — only operational practice. | Model as a BullMQ `Flow` with explicit parent/child dependencies; or use AWS Step Functions with sequential state machine |
| CORPT00C → JOBS TD Queue (internal reader) | HIGH | Only CICS-to-batch bridge. EXEC CICS START + WRITEQ TD JOBS submits JCL to internal reader. No TypeScript equivalent without async job framework. | Design BullMQ producer + NestJS REST endpoint before Wave 7; test end-to-end before CORPT00C migration |
| IBM MQ message contract (COACCT01) | HIGH | COACCT01 publishes account inquiry events to MQ queue. Downstream consumers outside this codebase may depend on the MQ message schema. If schema changes, downstream systems break. | Identify all MQ queue consumers before migration; document message schema; preserve format via a NestJS microservice client |
| COCRDSEC orphan CSD entry (CDV1) | HIGH | Transaction CDV1 registered in CARDDEMO.CSD but source COCRDSEC.cbl not found in `app/`. If CDV1 is entered at a terminal, CICS issues PGMIDERR abend. This is a **live defect**. | Investigate source location or confirm source was deleted; remove CDV1 from CSD immediately |
| IMS DBD/PSB schemas absent | HIGH | CL-16 authorization programs (5 programs) call CBLTDLI for IMS DL/I database access. IMS database schema files (DBD, PSB) not present in this repository. | Obtain IMS schema from operations team; reverse-engineer if necessary before attempting Wave 6 IMS programs |
| FTPJCL.JCL external dependency | MEDIUM | FTPJCL.JCL transfers files to IP 172.31.21.124 with hardcoded credentials. Unclear if this IP is internal infrastructure or external partner. Migration must preserve this transfer. | Identify FTP target; determine if still in use; replace with S3 + AWS Transfer Family or SFTP with Secrets Manager credentials |
| CICS START async (CODATE01) | MEDIUM | CODATE01 uses CICS START + RETRIEVE pattern for asynchronous date service. No TypeScript equivalent without event-driven framework. | Replace with a BullMQ job + Kafka/RabbitMQ consumer; or eliminate if date service is no longer needed in the TypeScript target |
| DALYTRAN external input feed | MEDIUM | CBTRN02C and CBTRN01C read DALYTRAN (daily transaction file) from external feed. Source of this feed not visible in this codebase. | Identify DALYTRAN producer; design TypeScript equivalent (event stream / file drop) before Wave 3 |
| CBACT04C DISCGRP file source | LOW | Interest rate discount groups are loaded by DISCGRP.JCL setup job. Source of rate data not visible. | Confirm DISCGRP data source; ensure it is loaded to PostgreSQL `dis_group_record` table before Phase 3 |

---

## Organizational Risks

These risks relate to people, process, and governance rather than technical code
translation.

| Risk | Severity | Detail | Mitigation |
|---|---|---|---|
| No test harnesses in source tree | HIGH | Zero unit tests, regression test data, or test harness found in `app/`. Migration quality cannot be measured without a test baseline. | Establish test data set and dual-harness (GnuCOBOL + Bun test) before Wave 1 begins |
| COBOL tribal knowledge | HIGH | COACTUPC (4,236 lines, no comments) contains undocumented business rules. If no COBOL SME is available, validation logic may be misunderstood. | Identify and retain COBOL SME for Wave 7–8 program reviews; budget for COBOL reading training for TypeScript developers |
| Mainframe access for parallel run | MEDIUM | Parallel run requires simultaneous mainframe access and the NestJS environment. Mainframe access hours, change windows, and cost must be pre-arranged with operations. | Confirm parallel run access agreement with mainframe operations team before Phase 3 |
| Team TypeScript/NestJS skill gaps | MEDIUM | Migration team must have TypeScript 5, NestJS 10, BullMQ, TypeORM, and PostgreSQL skills. Missing skills delay translation and reduce quality. | Conduct skills assessment before Wave 0; address gaps with training or consulting augmentation |
| Migration scope creep (variant modules) | MEDIUM | IMS/DB2/MQ variant modules add 13 programs (9,525 LOC) to scope. If scope is unclear, timeline and cost estimates will be wrong. | Define variant scope in writing before Wave 0; create separate migration track if variants are deprioritized |
| No production test data | MEDIUM | Without anonymized production data, integration tests use synthetic data that may miss real-world edge cases. | Obtain production data snapshot; anonymize (mask SSN, PAN, names); load to test environment before Wave 3 financial programs |
| Post-migration maintainers not identified | MEDIUM | The NestJS/TypeScript system needs maintainers after migration. If they are not identified early, knowledge transfer does not happen during migration. | Identify the post-migration TypeScript team before Wave 4; include them in code reviews from Wave 1 |
| Regulatory review timeline | LOW | Migration of a PCI-regulated system may require QSA review, adding time to the schedule. | Engage QSA early; confirm whether this migration triggers a formal compliance review |
