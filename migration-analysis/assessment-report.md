# Migration Assessment Report — AWS CardDemo

**Prepared by:** Assessment Lead
**Date:** 2026-02-28
**Classification:** Technical Leadership

***

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Codebase Profile](#codebase-profile)
3. [Architecture Analysis](#architecture-analysis)
4. [Risk Assessment](#risk-assessment)
5. [Migration Roadmap](#migration-roadmap)
6. [Effort Estimates](#effort-estimates)
7. [Recommended Approach](#recommended-approach)
8. [Strangler Fig Strategy](#strangler-fig-strategy)
9. [Test Strategy](#test-strategy)
10. [Security & Compliance](#security--compliance)
11. [Proof-of-Concept Plan](#proof-of-concept-plan)
12. [Team Readiness](#team-readiness)
13. [Appendices](#appendices)

***

## Executive Summary

The AWS CardDemo application is a COBOL/CICS credit card management system comprising
**31 core programs** (20,650 LOC), **13 optional variant programs** (9,525 LOC), **30
copybooks**, **17 BMS screen maps**, and **38 JCL batch jobs**. The system uses VSAM
KSDS files as its primary data store with CICS for online transaction processing.

**Key findings:**

* **No program scored ≥ 4.0 composite difficulty.** The highest is COACTUPC at 3.85, which
  is a candidate for manual rewrite due to 51 GO TO statements and 43 REDEFINES.
* **5 Hard programs (3.0–4.0), 20 Moderate (2.0–3.0), 22 Easy (<2.0).** The majority
  of the codebase is tractable with AI-assisted translation.
* **2 migration blockers:** CBSTM03A (ALTER + POINTER to OS control blocks) and COACTUPC
  (structural complexity) require manual refactoring before translation.
* **2 assembler stubs** (COBDATFT, MVSWAIT) require TypeScript reimplementation before Wave 1.
* **Scope reduction is 3%** (~620 dead LOC of 20,650 total). CardDemo is a clean 2022–2023
  demo application, not a decades-old system with accumulated dead code.
* **Three critical security findings** requiring immediate action independent of migration:
  hardcoded FTP credentials, plaintext password storage (PCI DSS violation), and CVV
  persistence in VSAM (PCI DSS requirement 3.3 violation).
* **Recommended approach:** AI-Assisted Rewrite using the Strangler Fig pattern. The
  codebase is well-structured and amenable to phased migration. A big-bang cutover is
  not appropriate.

***

## Codebase Profile

### Scale Metrics

| Category                               | Count | Lines      |
|----------------------------------------|-------|------------|
| COBOL programs — core (main app)       | 31    | 20,650     |
| COBOL programs — variants (IMS/DB2/MQ) | 13    | 9,525      |
| Assembler programs                     | 2     | 114        |
| Copybooks                              | 30    | 2,786      |
| BMS screen mapsets                     | 17    | 4,472      |
| JCL jobs                               | 38    | 2,429      |
| JCL procedures                         | 2     | 114        |
| **Total source lines (all)**           |       | **40,090** |

### Program Breakdown

| Type               | Count | LOC    | Notes                                       |
|--------------------|-------|--------|---------------------------------------------|
| CICS Online (main) | 17    | 11,155 | Pseudo-conversational; 3270 terminal UI     |
| Batch (main)       | 12    | 4,403  | Sequential file processing; JCL-driven      |
| Called subprograms | 2     | 276    | CSUTLDTC (date validation), CBSTM03B (I/O)  |
| Assembler          | 2     | 114    | COBDATFT, MVSWAIT — manual reimplementation |
| Variant programs   | 13    | 9,525  | IMS DL/I, DB2 CICS, IBM MQ variants         |

### Technology Fingerprint

| Technology               | Status               | Migration Impact                                             |
|--------------------------|----------------------|--------------------------------------------------------------|
| CICS                     | Present (core)       | All 17 online programs; COMMAREA pattern → stateless REST    |
| VSAM KSDS                | Present (8 files)    | Primary data store → PostgreSQL tables                       |
| BMS (3270)               | Present (17 mapsets) | Terminal UI → React components                               |
| IBM Language Environment | Present              | CEE3ABD, CEEDAYS → NestJS exception filters, date-fns / Temporal |
| IMS DL/I                 | Variant only         | CBLTDLI calls → requires IMS-to-PostgreSQL migration first   |
| DB2 Embedded SQL         | Variant only         | SELECT/INSERT/UPDATE/DELETE → TypeORM repositories           |
| IBM MQ                   | Variant only         | MQ PUT → NestJS microservice client (Kafka/RabbitMQ) or Amazon SQS |
| RACF                     | **Absent**           | App-level auth via USRSEC VSAM → NestJS Guards + Passport JWT |
| GDG                      | Present              | Generation Data Groups → managed file naming in BullMQ flows |

### Complexity Distribution

| Difficulty Band    | Score Range | Count | % of Programs |
|--------------------|-------------|-------|---------------|
| Easy               | 1.0–2.0     | 22    | 47%           |
| Moderate           | 2.0–3.0     | 20    | 43%           |
| Hard               | 3.0–4.0     | 5     | 10%           |
| Very Hard          | ≥ 4.0       | 0     | 0%            |
| Assembler (manual) | N/A         | 2     | —             |

### Dead Code Summary

| Item                | Count                      | LOC      | Confidence |
|---------------------|----------------------------|----------|------------|
| Dead programs       | 1 (CBTRN01C)               | 415      | HIGH       |
| Dead copybooks      | 2 (CSSTRPFY, UNUSED1Y)     | 95       | HIGH       |
| Dead paragraphs     | 5 paragraphs in 2 programs | ~112     | HIGH       |
| **Total dead LOC**  |                            | **~622** |            |
| **Scope reduction** |                            | **~3%**  |            |

> **Note:** 3% dead code is expected for a 2022–2023 purpose-built demo application.
> Production legacy systems typically carry 30–50% dead code.

***

## Architecture Analysis

### Coupling Assessment

The CardDemo architecture is **moderately coupled** with clear structural separation
between batch and online tiers.

**Positive coupling indicators:**

* Clean batch/online split: batch programs are prefixed `CB*`, CICS programs `CO*`
* Strict 1:1 program-to-BMS-map relationship across all 17 CICS programs
* VSAM files serve as the integration layer between batch and online (no MQ coupling in core)
* Pseudo-conversational CICS pattern maps cleanly to stateless REST + client session

**Negative coupling indicators:**

* `COCOM01Y` (CICS COMMAREA layout) is consumed by 26 programs — any change requires
  coordinated regression across the entire online tier
* 5 strongly connected components (bidirectional XCTL cycles) require migration in cohesive groups
* `CORPT00C` is the sole CICS-to-batch bridge via TD Queue JOBS → internal reader pattern

### Natural Migration Boundaries

Dependency cluster analysis identified 17 migration clusters (CL-00 through CL-16).
Five clusters require co-migration due to bidirectional XCTL coupling:

| Cluster | Programs                     | Why Coupled                              |
|---------|------------------------------|------------------------------------------|
| CL-03   | COACTUPC, COACTVWC           | Bidirectional XCTL + 3 shared VSAM files |
| CL-04   | COCRDLIC, COCRDSLC, COCRDUPC | Circular XCTL + shared CARDDAT/CCXREF    |
| CL-05   | COTRN00C, COTRN01C, COTRN02C | Circular XCTL + shared TRANSACT          |
| CL-06   | COUSR00C–COUSR03C            | One-way XCTL hub + shared USRSEC         |
| CL-15   | COTRTLIC, COTRTUPC           | Bidirectional XCTL + DB2 tables          |

### Batch Pipeline Structure

The core batch pipeline has an implicit execution ordering enforced by GDG
(Generation Data Group) dependencies. This ordering must be preserved in the
replacement scheduler:

```
POSTTRAN (CBTRN02C) → writes DALYREJS(+1) + updates ACCTFILE
    ↓
INTCALC (CBACT04C) → reads ACCTFILE, writes SYSTRAN(+1) GDG
    ↓
COMBTRAN (SORT) → reads SYSTRAN(0) + TRANSACT.BKUP(0), writes TRANSACT.COMBINED(+1)
    ↓
TRANREPT (CBTRN03C) → reads TRANSACT.COMBINED, writes TRANREPT(+1)
```

Any replacement scheduler (BullMQ Flows, AWS Step Functions, or equivalent) must
enforce this execution order.

### CICS Transaction Model

The application uses **pseudo-conversational CICS** throughout. Each CICS program:

1. Receives control via transaction entry or XCTL from another program
2. Reads its COMMAREA (`DFHCOMMAREA` / `COCOM01Y`) for session state
3. Performs BMS `RECEIVE MAP` (keyboard input) or `SEND MAP` (screen output)
4. Issues `EXEC CICS RETURN TRANSID(...)` to yield control, passing updated COMMAREA

This pattern maps cleanly to stateless REST APIs + client-side session management (JWT
claims or cookies). Each CICS transaction ID (CC00, CM00, CA00, etc.) maps to one or
more REST endpoints.

***

## Risk Assessment

### Technical Risks

| Risk                                                  | Programs Affected                                                         | Severity     | Mitigation                                                                           |
|-------------------------------------------------------|---------------------------------------------------------------------------|--------------|--------------------------------------------------------------------------------------|
| ALTER statements — dynamically reassign GO TO targets | CBSTM03A                                                                  | **CRITICAL** | Manual rewrite required; static analysis cannot determine all runtime paths          |
| POINTER to MVS control blocks (PSA/TCB/TIOT)          | CBSTM03A                                                                  | **CRITICAL** | Identify what data is accessed; replace with TypeScript equivalents or eliminate     |
| >10 GO TO statements                                  | COACTUPC (51), COCRDUPC (21), COCRDLIC (16), CBSTM03A (15), CBSTM03B (13) | HIGH         | Manual control-flow tracing; structured refactoring before translation               |
| Assembler programs (no COBOL equivalent)              | COBDATFT, MVSWAIT                                                         | HIGH         | Reimplement as TypeScript utility modules in Wave 0                                  |
| COCRDSEC CSD orphan entry (CDV1) — no source found    | CSD only                                                                  | HIGH         | Live CICS defect (PGMIDERR abend on entry); remove from CSD before migration         |
| CICS START async pattern                              | CORPT00C, CODATE01                                                        | HIGH         | Requires BullMQ + Kafka/RabbitMQ job trigger design before translation               |
| VSAM alternate index (CXACAIX)                        | COBIL00C                                                                  | MEDIUM       | Model as PostgreSQL secondary index; test card-number lookup path                    |
| 43 REDEFINES                                          | COACTUPC                                                                  | HIGH         | Requires discriminated-union / interface hierarchy design in TypeScript              |
| COPY REPLACING ×39 (CSSETATY)                         | COACTUPC                                                                  | HIGH         | Generates thousands of compile-time source lines; refactor to React validation state |
| IMS DL/I dependencies                                 | CL-16 (5 programs)                                                        | HIGH         | IMS database must be migrated to PostgreSQL before authorization programs            |
| Dynamic XCTL from table data                          | COMEN01C, COADM01C                                                        | LOW          | Fully resolved from COMEN02Y / COADM02Y tables; all targets identified               |
| IBM LE runtime calls (CEE3ABD, CEEDAYS)               | 12 batch programs, CSUTLDTC                                               | MEDIUM       | Replace with NestJS exception filters and date-fns / Temporal APIs                   |

### Data Risks

| Risk                                       | Severity     | Details                                                                                                             | Mitigation                                                                          |
|--------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| EBCDIC → UTF-8 conversion                  | HIGH         | All PIC X fields stored in EBCDIC (CP037). Sort order differs from UTF-8 — EBCDIC lowercase sorts before uppercase. | Validate all ORDER BY and comparison logic after conversion                         |
| Packed decimal (COMP-3) conversion         | HIGH         | COMP-3 fields store 2 digits/byte + sign nibble. Wrong conversion → silent data corruption.                         | Use validated COMP-3 decoder; verify against CVEXPORT sample data                   |
| Plaintext passwords in USRSEC VSAM         | **CRITICAL** | SEC-USR-PWD PIC X(08) stores passwords in plaintext                                                                 | Hash with bcrypt (cost ≥12) or Argon2id during data migration; force password reset |
| CVV stored in CARDFILE VSAM                | **CRITICAL** | CARD-CVV-CD PIC 9(03) persisted — violates PCI DSS requirement 3.3                                                  | Do NOT migrate CVV column to PostgreSQL; delete from migration export               |
| SSN as plain integer                       | HIGH         | CUST-SSN PIC 9(09) — stored as integer; leading zeros lost; no encryption                                           | Encrypt at column level (pgcrypto) or tokenize; SSN leading zero restoration needed |
| PII in cleartext                           | MEDIUM       | Customer name, DOB, govt ID, address, phone in plain VSAM                                                           | Apply PostgreSQL row security policies or column encryption for PII                 |
| Date format ambiguity                      | LOW          | All date fields use PIC X(10) with YYYY-MM-DD format — confirmed; no Y2K ambiguity                                  | Use date-fns ISO format helpers / `Temporal.PlainDate`                              |
| COMP range under TRUNC(STD)                | MEDIUM       | PIC 9(9) COMP = max 999,999,999, not `Number.MAX_SAFE_INTEGER`                                                      | Verify compile JCL for TRUNC option; add range validation via class-validator decorators |
| Duplicate copybook (CUSTREC vs CVCUS01Y)   | LOW          | CUSTREC has same layout as CVCUS01Y with minor field name difference                                                | Use CVCUS01Y as canonical; discard CUSTREC                                          |
| CSLKPCDY 1,318-line hardcoded lookup table | MEDIUM       | US state/ZIP/phone lookup hardcoded in COBOL                                                                        | Extract to PostgreSQL reference table; load at startup                              |

### Integration Risks

| Risk                                                | Severity | Details                                                                                     | Mitigation                                                                                 |
|-----------------------------------------------------|----------|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| CORPT00C → JOBS TD Queue (internal reader)          | HIGH     | Only CICS-to-batch bridge; no direct TypeScript equivalent                                  | Replace with BullMQ producer + async REST endpoint, or Kafka event                         |
| GDG sequencing (POSTTRAN→INTCALC→COMBTRAN→TRANREPT) | HIGH     | Implicit ordering via GDG generation numbers; violated execution causes data corruption     | Enforce ordering in replacement scheduler with explicit job dependencies                   |
| IBM MQ event contracts (COACCT01)                   | HIGH     | MQ message schema published by COACCT01 may have downstream consumers outside this codebase | Document and preserve MQ message format; identify all queue consumers before migration     |
| COCRDSEC orphan (CDV1 transaction)                  | HIGH     | Live CICS CSD entry with no source — production PGMIDERR risk                               | Investigate and remove CDV1 from CSD immediately                                           |
| External FTP transfer (FTPJCL)                      | MEDIUM   | FTP job with hardcoded credentials; unclear downstream consumers                            | Identify FTP target and purpose; replace with secure S3 or SFTP with credential management |
| CICS START async (CODATE01)                         | MEDIUM   | START + RETRIEVE asynchronous date service; no direct TypeScript equivalent                 | Replace with a BullMQ job + Kafka/RabbitMQ consumer; or eliminate if unused                |
| IMS DBD/PSB schemas not in repository               | HIGH     | IMS authorization programs (CL-16) require DBD/PSB definitions not present in `app/`        | Obtain IMS schema from operations team before attempting IMS variant migration             |

### Organizational Risks

| Risk                                     | Severity | Mitigation                                                                                                                         |
|------------------------------------------|----------|------------------------------------------------------------------------------------------------------------------------------------|
| Tribal knowledge of COBOL business rules | HIGH     | COACTUPC (4,236 lines, 0 comments) contains undocumented validation logic — requires COBOL SME review before translation           |
| No test harnesses in source tree         | HIGH     | No unit tests, no regression data found; migration quality cannot be measured without establishing test baseline first             |
| Mainframe access for parallel run        | MEDIUM   | Parallel run validation requires simultaneous access to mainframe and TypeScript/NestJS environments; coordinate access windows with operations |
| Team COBOL literacy                      | MEDIUM   | TypeScript developers translating COBOL must understand packed decimal, CICS lifecycle, and VSAM browse patterns — training required |
| TypeScript/NestJS skill gaps             | MEDIUM   | See Team Readiness section                                                                                                         |
| Migration scope creep (variant modules)  | MEDIUM   | IMS/DB2/MQ variants add 9,525 LOC of optional scope; agree on which variants are in scope before committing                        |

***

## Migration Roadmap

The roadmap follows an **easiest-first, highest-risk-last** strategy using 8 migration
waves. This builds team confidence and infrastructure before tackling complex programs.

> **Important:** No calendar estimates are provided. Actual duration depends on team
> skill, testing requirements, and organizational velocity. See Effort Estimates for
> complexity-based sizing data to convert to calendar estimates.

### Phase 0: Pre-Migration — Blockers & Infrastructure

**Goal:** Eliminate assembler dependencies; establish PostgreSQL schema and the
TypeScript/NestJS project structure. No COBOL programs migrated in this phase.

| Item                       | Action                                                    | Output                      |
|----------------------------|-----------------------------------------------------------|-----------------------------|
| COBDATFT (assembler)       | Reimplement as TypeScript `dateUtils.formatDate()`        | Unblocks CBACT01C           |
| MVSWAIT (assembler)        | Replace with `await Bun.sleep(centiseconds * 10)`         | Unblocks COBSWAIT           |
| CSUTLDTC (subprogram)      | Migrate date validation library                           | Unblocks CORPT00C, COTRN02C |
| PostgreSQL schema          | Apply `migration/schema.sql`                              | Database foundation         |
| NestJS project scaffolding | NestJS 10 monorepo on Bun + TypeScript, npm workspaces    | Build pipeline              |
| Auth framework             | NestJS Guards + Passport JWT + bcrypt                     | Unblocks COSGN00C           |
| Reference data migration   | Load CSLKPCDY data → `reference_data` table               | Unblocks COACTUPC           |

### Phase 1: Quick Wins — Batch Leaf Nodes

**Goal:** Validate COBOL-to-TypeScript translation pipeline on simple, isolated programs.
Each program has no incoming dependencies and clean batch structure.

| Wave | Programs                     | Composite | Rationale                                              |
|------|------------------------------|-----------|--------------------------------------------------------|
| 1A   | CBACT02C, CBACT03C, CBCUS01C | 1.40      | Near-identical 178-line readers; validate VSAM→TypeORM |
| 1B   | COBTUPDT, PAUDBLOD, DBUNLDGS | 1.35–1.55 | Simple DB2 SQL patterns; validate BullMQ + TypeORM     |
| 1C   | COBSWAIT                     | 1.60      | Trivial (`Bun.sleep`) after Wave 0                     |

**Exit criterion:** 3 programs translated, tested, producing identical output to mainframe.

### Phase 2: Core Batch Infrastructure

**Goal:** Migrate the batch processing backbone and data migration tools.

| Wave | Programs                     | Composite | Key Concern                                        |
|------|------------------------------|-----------|----------------------------------------------------|
| 2A   | CBTRN03C                     | 1.55      | Read-only transaction report; safe baseline        |
| 2B   | CBACT01C, CBEXPORT, CBIMPORT | 1.85–2.10 | Data migration tools; CBACT01C unblocked by Wave 0 |

### Phase 3: Financial Batch (Shadow Run Required)

**Goal:** Migrate revenue-critical batch jobs. These require parallel run validation
before cutover.

| Program  | Composite | Financial Risk                                 | Shadow Run Required           |
|----------|-----------|------------------------------------------------|-------------------------------|
| CBACT04C | 1.85      | Interest calculation — exact decimal precision | YES — minimum 1 billing cycle |
| CBTRN02C | 2.00      | Transaction posting — account balance mutation | YES — minimum 1 billing cycle |

**Exit criterion:** the NestJS service and mainframe produce bit-for-bit identical
account balances across 30 days of production data before Phase 3 programs go live.

### Phase 4: Simple CICS Screens

**Goal:** Establish the CICS→React/REST pattern on the simplest screens.

| Programs                     | Composite | Pattern Established             |
|------------------------------|-----------|---------------------------------|
| COTRN01C, COUSR01C           | 2.00      | Simple CICS READ → GET endpoint |
| COMEN01C, COADM01C           | 2.00      | Navigation hub → React router   |
| COUSR02C, COUSR03C, COUSR00C | 2.00–2.25 | Full user management CRUD       |

### Phase 5: Authentication & Medium CICS

| Programs | Composite | Key Concern                                                                       |
|----------|-----------|-----------------------------------------------------------------------------------|
| COSGN00C | 2.10      | **Security boundary** — plaintext VSAM passwords; must integrate NestJS auth (Guards + Passport JWT) |
| COACTVWC | 2.70      | Account view; VSAM read                                                           |
| COTRN00C | 2.40      | Bidirectional VSAM browse → PostgreSQL pagination                                 |

### Phase 6: Variant Modules

| Cluster           | Programs                    | Composite | Special Requirement                     |
|-------------------|-----------------------------|-----------|-----------------------------------------|
| DB2 variants      | COTRTUPC, COTRTLIC          | 2.30–2.45 | Straightforward DB2 CRUD                |
| MQ variants       | COACCT01, CODATE01          | 2.45–2.80 | Preserve MQ message contract            |
| IMS authorization | CBPAUP0C, COPAUA0C–COPAUS2C | 2.15–2.80 | **IMS database migration prerequisite** |

### Phase 7: Financial CICS & Batch Bridge

| Programs | Composite | Key Concern                                                                                       |
|----------|-----------|---------------------------------------------------------------------------------------------------|
| COCRDSLC | 2.80      | Card search + pagination                                                                          |
| COBIL00C | 2.90      | **Bill payment** — VSAM alternate index + financial transaction (TypeORM `dataSource.transaction`) |
| COTRN02C | 2.90      | **Transaction creation** — financial mutation                                                     |
| CORPT00C | 3.00      | **Architecture boundary** — CICS START → async job trigger                                        |

### Phase 8: Hard Programs — Manual Rewrites

| Programs            | Composite   | Approach                                                                              |
|---------------------|-------------|---------------------------------------------------------------------------------------|
| CBSTM03B + CBSTM03A | 2.30 + 3.00 | **Manual rewrite** — ALTER + POINTER; Handlebars/EJS templates for HTML output        |
| COCRDLIC + COCRDUPC | 3.30 + 3.40 | AI-assisted + manual refactoring; migrate as pair                                     |
| COACTUPC            | 3.85        | **Manual rewrite** — 51 GO TO, 43 REDEFINES; decompose into 4 NestJS modules/services |

***

## Effort Estimates

> **IMPORTANT:** No calendar estimates are provided. Effort varies 10x depending on
> team skill, testing requirements, and organizational constraints that code analysis
> cannot determine. The table below provides complexity-based sizing data. Multiply by
> your team's observed velocity to produce calendar estimates.

### Sizing Table

| Metric                               | Count                                      | Migration Implication                                                          |
|--------------------------------------|--------------------------------------------|--------------------------------------------------------------------------------|
| Living programs — batch (core)       | 11                                         | Each needs: translation + unit tests + integration test + parallel-run harness |
| Living programs — CICS online (core) | 17                                         | Each needs: translation + service layer + GraphQL/REST endpoint + React screen |
| Living programs — called subprograms | 2                                          | Library code; translate once, used by multiple programs                        |
| Assembler programs                   | 2                                          | Wave 0 reimplementation; trivial in TypeScript                                 |
| Copybooks (shared entity structures) | 28                                         | Each needs: TypeORM entity / TypeScript interface + PostgreSQL DDL             |
| Hub copybooks (>10 consumers)        | 4 (COCOM01Y, CVACT03Y, COTTL01Y, CSDAT01Y) | Translate first; every consumer depends on these being correct                 |
| JCL jobs → BullMQ / NestJS Schedule  | 16 (batch processing jobs)                 | Each needs: BullMQ processor / scheduled task definition + step implementation |
| BMS mapsets → React components       | 17                                         | Each needs: React component + GraphQL queries/mutations                        |
| VSAM files → PostgreSQL tables       | 8                                          | Schema migration + VSAM data export + PostgreSQL load                          |
| Variant programs (optional scope)    | 13                                         | Include in scope only if variants are required in target                       |
| Programs scoring ≥ 3.0 (Hard tier)   | 5                                          | Expect 4–8x effort vs average program                                          |
| Dead programs (excludable)           | 1 (CBTRN01C)                               | ~3% scope reduction                                                            |
| Programs requiring shadow run        | 4 (CBTRN02C, CBACT04C, COBIL00C, COTRN02C) | Add parallel-run validation window to schedule                                 |

### Relative Effort Multipliers

| Complexity Band | Score Range   | Count                  | Effort Multiplier       |
|-----------------|---------------|------------------------|-------------------------|
| Easy            | 1.0–2.0       | 22                     | 1× baseline             |
| Moderate        | 2.0–3.0       | 20                     | 2× baseline             |
| Hard            | 3.0–4.0       | 5                      | 4–8× baseline           |
| Manual Rewrite  | ALTER/POINTER | 2 (CBSTM03A, COACTUPC) | 8–12× baseline          |
| Assembler       | N/A           | 2                      | 0.5× baseline (trivial) |

**Sizing note for COACTUPC:** This single program (3.85 composite, 4,236 lines)
represents the largest single migration item. It should be treated as a **project
within the project** — allocate independently and staff with your most experienced
TypeScript/NestJS developer plus a COBOL SME.

***

## Recommended Approach

**Recommendation: AI-Assisted Rewrite**

Rationale:

* The codebase is well-structured (0 programs ≥4.0; clean batch/online separation)
* Business logic is legible COBOL without excessive spaghetti (except COACTUPC, CBSTM03A)
* Target is idiomatic TypeScript/NestJS the team will maintain long-term
* Automated translation tools (e.g. AWS Transform / Blu Age) produce "COBOL in Java" that teams cannot maintain — the same risk applies to any naive line-by-line port to TypeScript

**Do NOT recommend:**

* **Big-bang cutover** — too many financial programs require parallel validation
* **Full automated translation** — COACTUPC and CBSTM03A will produce untranslatable output
* **API wrapper (augment only)** — insufficient for this migration scope; mainframe decommission is the goal

**Hybrid where appropriate:**

* Wave 0–2 (batch utilities): automated translation with light review
* Wave 3 (financial batch): AI translation + intensive human review + shadow run
* Wave 4–5 (simple CICS): AI translation + standard review
* Wave 8 (hard programs): manual rewrite; AI used for comprehension only

***

## Strangler Fig Strategy

**A big-bang cutover is not recommended.** The strangler fig pattern allows the
mainframe and TypeScript/NestJS systems to coexist during migration, with traffic
shifted incrementally.

### Architecture Overview

```
                    ┌─────────────────────────┐
                    │      API Gateway         │
                    │  (Kong / AWS API GW)     │
                    └────────┬────────────────┘
                             │
               Route per transaction
                    ┌────────┴────────┐
                    │                 │
           ┌────────▼──────┐  ┌──────▼────────┐
           │   Mainframe    │  │ NestJS + PG   │
           │  CICS + VSAM   │  │  (TypeScript) │
           │  (existing)    │  │  (migrated)   │
           └───────────────┘  └───────────────┘
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────▼───────────┐
                    │  Data Sync Layer    │
                    │  (CDC / batch sync) │
                    └────────────────────┘
```

### Implementation Steps

1. **API Gateway installation** — Route all traffic through gateway initially. All
   requests route to mainframe. Zero user impact.

2. **Data synchronization** — During parallel run, changes must propagate in both
   directions:
   * **Mainframe → PostgreSQL:** CDC via Db2/VSAM log reader or batch extract/load
     (nightly CBEXPORT → PostgreSQL load script)
   * **PostgreSQL → Mainframe:** Batch push or queue-based reverse sync

3. **Per-transaction routing with feature flags** — As each CICS transaction is
   translated and validated, flip its gateway route from mainframe to the NestJS
   service. Use LaunchDarkly or an open-source flag service (e.g. Unleash,
   OpenFeature) for instant rollback capability.

   Example routing table:
   | Transaction           | Current Route | Post-Migration Route           |
   |-----------------------|---------------|--------------------------------|
   | CC00 (signon)         | Mainframe     | NestJS                         |
   | CM00 (main menu)      | Mainframe     | NestJS                         |
   | CB00 (bill payment)   | Mainframe     | Mainframe (pending shadow run) |
   | CAUP (account update) | Mainframe     | Mainframe (Wave 8)             |

4. **Parallel run validation** — Run identical transactions against both systems.
   Compare results. Flag any discrepancy before expanding rollout.

5. **Cutover** — When all transactions route to NestJS and parallel run shows 0
   discrepancies across 30 days, decommission mainframe routing.

### Data Sync Strategy

During migration, VSAM and PostgreSQL must stay in sync:

| Approach                                   | Complexity | Consistency                     | Recommendation                                       |
|--------------------------------------------|------------|---------------------------------|------------------------------------------------------|
| Nightly batch sync (VSAM export → PG load) | Low        | Eventually consistent (24h lag) | Acceptable for non-financial data                    |
| Real-time CDC via VSAM journal             | High       | Near-real-time                  | Required for ACCTFILE during financial parallel run  |
| Dual-write (app writes both)               | Medium     | Synchronous                     | Use for Phase 3 financial programs during shadow run |

***

## Test Strategy

### Three-Level Testing Framework

**Level 1: Unit Tests (per program)**

* Generated alongside each translated program
* Test business logic with known inputs → expected outputs
* Use an injected clock provider for deterministic date/time behavior
* Boundary value tests derived from PIC clause ranges:
  * `PIC 9(11)` → test 0, 1, 99999999999 (max)
  * `PIC S9(10)V99` → test 0.00, max positive, max negative
* No database or CICS dependencies; pure TypeScript logic

**Level 2: Integration Tests (per batch pipeline / transaction flow)**

* Use Testcontainers (PostgreSQL + Redis in Docker) for isolated environments
* Batch pipeline tests: seed data → run BullMQ job → verify output tables
* CICS flow tests: HTTP requests to GraphQL/REST API → verify state changes in DB
* Cover the 4 GDG-ordered pipeline steps as a single end-to-end test

**Level 3: Parallel Run Tests (system level)**

* Same transaction executed against mainframe and NestJS service simultaneously
* Output comparison: account balances, transaction records, generated statements
* Statistical threshold: 10,000 transactions with zero discrepancies required before
  cutover of financial programs (CBTRN02C, CBACT04C, COBIL00C, COTRN02C)

### Test Data Strategy

* Export anonymized production snapshot (mask PII: real names → fake names,
  SSN → random 9-digit, PAN → tokenized)
* Generate synthetic data preserving referential integrity:
  customers → accounts → cards → transactions chain
* Edge cases to include:
  * Leap year dates (Feb 29)
  * End-of-month interest calculation boundaries
  * Maximum account balance (PIC S9(10)V99 = ±999,999,999.99)
  * Zero balance accounts
  * Accounts with no transactions
  * Multiple cards per account

### Financial Program Test Requirements

Programs CBTRN02C, CBACT04C, COBIL00C, and COTRN02C require **shadow run testing**
before cutover. Shadow run protocol:

1. Run both mainframe and NestJS service against identical input data
2. Compare: account balances, transaction counts, reject file contents, generated statements
3. Run for minimum one complete billing cycle (30 days)
4. Zero discrepancies required for cutover authorization

***

## Security & Compliance

### Critical Findings — Action Required Before Migration

The following security issues must be remediated immediately, independent of migration
timeline:

#### FINDING 1: Hardcoded FTP Credentials — SEVERITY: HIGH

* **File:** `app/jcl/FTPJCL.JCL` lines 33–35
* **Issue:** FTP server IP, username, and password in plaintext JCL source
* **Action:** Remove from source control immediately or replace with symbolic parameters
  (`&FTPUSER`, `&FTPPASS`) resolved from a secure credential store (HashiCorp Vault,
  AWS Secrets Manager, or equivalent)
* **Risk if unaddressed:** Credentials exposed to anyone with source repository access

#### FINDING 2: Plaintext Password Storage — SEVERITY: CRITICAL (PCI DSS)

* **File:** `app/cpy/CSUSR01Y.cpy` field `SEC-USR-PWD PIC X(08)`
* **Issue:** User passwords stored as plaintext 8-character strings in USRSEC VSAM
* **Action:** During data migration, hash all passwords with bcrypt (cost ≥12) or
  Argon2id before loading to PostgreSQL `sec_user_data` table. The 8-char COBOL field
  expands to `VARCHAR(72)` for bcrypt hash storage. Consider forcing password resets
  for all users post-migration.

#### FINDING 3: CVV Persistence — SEVERITY: CRITICAL (PCI DSS Requirement 3.3)

* **File:** `app/cpy/CVACT02Y.cpy` field `CARD-CVV-CD PIC 9(03)`
* **Issue:** CVV stored in CARDFILE VSAM — violates PCI DSS requirement 3.3 (prohibited
  after authorization)
* **Action:** Do NOT migrate CARD-CVV-CD to PostgreSQL. Exclude this field from the
  CBEXPORT → PostgreSQL migration pipeline. Delete or nullify this column in the
  migration SQL.

#### FINDING 4: SSN as Plain Integer — SEVERITY: HIGH

* **File:** `app/cpy/CVCUS01Y.cpy` field `CUST-SSN PIC 9(09)`
* **Issue:** SSN stored as plain integer; leading zeros lost; no encryption
* **Action:** Encrypt at column level (PostgreSQL pgcrypto `pgp_sym_encrypt`) or
  tokenize via a PII vault service. Restore leading zeros before encryption.

### AI Code Analysis Risk

This assessment was produced using Claude Code (claude-sonnet-4-6 via Anthropic API or
AWS Bedrock). Relevant data policies:

* **AWS Bedrock:** All processing within the customer's AWS account; no data leaves the
  account boundary
* **Anthropic API direct:** Anthropic does not use customer API data for model training
  per their usage policy
* **Air-gapped alternative:** If source code is classified or regulated, contact the
  engagement team for on-premises analysis options

### PCI DSS Migration Compliance

The CardDemo migration constitutes a **significant system change** under PCI DSS.
Compliance obligations for the migration:

1. Translated TypeScript/NestJS code must maintain equivalent or stronger data protection controls
2. Add encryption at rest for cardholder data fields (`pgcrypto` or application-level AES-256)
3. Add audit logging for all access to PAN, CVV, SSN, and password fields
4. Mask PAN in application logs (first 6 / last 4 digits only)
5. The migration itself may require a QSA (Qualified Security Assessor) review
6. Conduct penetration testing on the new NestJS system before cutover

### Translation Audit Trail

Per compliance requirements, generate `migration/audit-log.json` for each translated
program with the following structure:

```json
{
  "sourceProgram": "COACTUPC.cbl",
  "sourceHash": "sha256:<hash>",
  "targetFiles": ["account-update.service.ts", "account-update.service.spec.ts"],
  "translationTimestamp": "2026-03-xx",
  "modelUsed": "claude-sonnet-4-6",
  "humanReviewer": null,
  "reviewDate": null,
  "approved": false
}
```

***

## Proof-of-Concept Plan

See `migration/poc-plan.md` for the full PoC specification.

**Summary:** The recommended PoC targets two programs:

* **Batch PoC:** CBCUS01C (1.40 composite, 178 LOC) — simplest batch program; reads
  CUSTFILE VSAM and prints records
* **CICS PoC:** COTRN01C (2.00 composite, 330 LOC) — simple transaction detail view;
  representative CICS READ + BMS SEND MAP pattern

The PoC validates the full technical stack (COBOL → TypeScript/NestJS → React) before
committing to full migration.

***

## Team Readiness

Migrating from COBOL to TypeScript/NestJS replaces one skill gap with another. The following
matrix identifies gaps that must be addressed:

| Skill                                                          | Required For                        | Gap Risk                                  | Recommendation                                                  |
|----------------------------------------------------------------|-------------------------------------|-------------------------------------------|-----------------------------------------------------------------|
| TypeScript 5 (strict mode, generics, discriminated unions)     | All programs                        | HIGH if team is plain JS                  | Upgrade training; discriminated unions needed for REDEFINES     |
| NestJS 10 + BullMQ                                             | All batch and online programs       | HIGH                                      | Dedicated NestJS training or consulting support                 |
| NestJS Guards + Passport JWT                                   | Authentication (COSGN00C)           | MEDIUM                                    | Follow NestJS authentication reference documentation            |
| PostgreSQL administration                                      | Schema migration, tuning            | MEDIUM                                    | DBA training or managed service (AWS RDS)                       |
| GraphQL (`@nestjs/graphql`)                                    | CICS COMMAREA mapping               | MEDIUM                                    | Consider REST if GraphQL adoption risk is high                  |
| React 18 + TypeScript                                          | BMS screen replacement (17 screens) | HIGH if no frontend team                  | Outsource UI or hire frontend developer                         |
| Docker / Testcontainers                                        | Integration test infrastructure     | MEDIUM                                    | DevOps onboarding as part of Wave 0                             |
| COBOL reading literacy                                         | AI-assisted translation review      | HIGH — all TS reviewers need this         | 2-day COBOL reading workshop before translation begins          |

> **Discovery question for client:** Who will maintain the NestJS/TypeScript system
> post-migration? Ensure those maintainers are identified and included in the migration
> from Wave 1.

***

## Appendices

| Appendix                 | File                                 | Contents                                               |
|--------------------------|--------------------------------------|--------------------------------------------------------|
| A — Program Inventory    | `migration/inventory.md`             | Full program table with LOC, GOTO counts, descriptions |
| B — Program Catalog      | `migration/catalog.txt`              | Machine-readable program listing                       |
| C — Dependency Graph     | `migration/dependency-graph.md`      | Full cross-reference: calls, COPY, files, CICS         |
| D — Dependency Diagram   | `migration/dependency-graph.mermaid` | Visual graph (Mermaid)                                 |
| E — Migration Clusters   | `migration/clusters.md`              | 17 migration clusters with coupling analysis           |
| F — Complexity Scores    | `migration/complexity.md`            | 6-dimension scores for all 46 programs                 |
| G — Complexity JSON      | `migration/complexity.json`          | Machine-readable scores                                |
| H — Migration Sequence   | `migration/migration-sequence.md`    | Wave-by-wave program sequencing                        |
| I — Risk Matrix          | `migration/risk-matrix.md`           | Program-level risk register with mitigations           |
| J — Dead Code Report     | `migration/dead-code.md`             | Dead programs, copybooks, paragraphs                   |
| K — Dead Code JSON       | `migration/dead-code.json`           | Machine-readable dead code                             |
| L — Data Model           | `migration/data-model.md`            | All copybooks mapped to TypeScript + PostgreSQL        |
| M — Type Map             | `migration/type-map.json`            | COBOL PIC → TypeScript → PostgreSQL type mapping       |
| N — Schema SQL           | `migration/schema.sql`               | PostgreSQL DDL (all tables, indexes, FKs)              |
| O — Credential Scan      | `migration/credential-scan.md`       | Security findings from source scan                     |
| P — PoC Plan             | `migration/poc-plan.md`              | Proof-of-concept translation plan                      |
| Q — Technology Decisions | `migration/technology-decisions.md`  | Target stack rationale                                 |
| R — Review Checklist     | `migration/review-checklist.md`      | Human review gates                                     |
| S — Roadmap Diagram      | `migration/roadmap.mermaid`          | Visual migration timeline                              |

***

*Assessment Lead — CardDemo Mainframe Migration Project — 2026-02-28*
