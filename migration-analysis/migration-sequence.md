# Migration Sequence — CardDemo

**Generated:** 2026-02-28
**Strategy:** Easiest-first to build team confidence; resolve blockers before dependents; group by cohesion.

## Sequencing Principles

1. **Resolve assembler blockers first** — COBDATFT and MVSWAIT block specific programs
2. **Shared infrastructure before consumers** — migrate CSUTLDTC (date utility) before programs that call it
3. **Read-only before read-write** — view programs before update programs; batch reports before posting jobs
4. **Grouped by cohesion** — programs sharing data/flow migrate together to keep integration tests passing
5. **Highest business risk last** — financial posting and authorization programs migrate after infrastructure is proven

---

## Wave 0 — Pre-Migration (Blockers & Infrastructure)

**Goal:** Eliminate assembler dependencies; establish TypeScript/NestJS infrastructure. No COBOL program migration yet.

These are not COBOL migrations — they are TypeScript implementations that unblock Wave 1.

| # | Program | Action | Why |
|---|---|---|---|
| 0.1 | COBDATFT (Assembler) | Reimplement as TypeScript utility function | Blocks CBACT01C |
| 0.2 | MVSWAIT (Assembler) | Replace with `Bun.sleep()` / `setTimeout` | Blocks COBSWAIT |
| 0.3 | CSUTLDTC (Subprogram) | Migrate — date validation library | Called by CORPT00C, COTRN02C; composite 1.45 |

**Output:** TypeScript `DateUtils` module replacing COBDATFT + CSUTLDTC; `Bun.sleep()` replacing MVSWAIT.

---

## Wave 1 — Easy Batch Utilities (Composites 1.35–1.60)

**Goal:** Build team familiarity with COBOL-to-TypeScript patterns using simple, isolated batch programs.
**Team can proceed in parallel within this wave.**

### 1A — Simple VSAM Readers (Composites 1.40)
These three programs are nearly identical (178 lines each, same structure):

| # | Program | Composite | Description |
|---|---|---|---|
| 1.1 | CBACT02C | 1.40 | Read CARDFILE VSAM → print |
| 1.2 | CBACT03C | 1.40 | Read CARDXREF VSAM → print |
| 1.3 | CBCUS01C | 1.40 | Read CUSTFILE VSAM → print |

**Rationale:** Identical pattern — migrate once, copy-adapt for the other two. Validates VSAM→TypeORM entity mapping.

### 1B — Batch DB2 Utilities (Composites 1.35–1.55)

| # | Program | Composite | Description |
|---|---|---|---|
| 1.4 | COBTUPDT | 1.35 | Bulk DB2 UPDATE (transaction types) |
| 1.5 | PAUDBLOD | 1.40 | DB2 bulk INSERT from sequential file |
| 1.6 | DBUNLDGS | 1.55 | DB2 cursor unload to file |

**Rationale:** Simple SQL patterns; no CICS, no complex data structures. Tests BullMQ + TypeORM patterns.

### 1C — Utility Programs

| # | Program | Composite | Description |
|---|---|---|---|
| 1.7 | COBSWAIT | 1.60 | Assembler call → `Bun.sleep()` (trivial after Wave 0) |

---

## Wave 2 — Standard Batch Programs (Composites 1.55–2.10)

**Goal:** Establish batch processing patterns for core business operations.

### 2A — Transaction Reports (Read-only batch)

| # | Program | Composite | Description |
|---|---|---|---|
| 2.1 | CBTRN01C | 1.55 | Daily transaction report (read-only) |
| 2.2 | CBTRN03C | 1.55 | Transaction detail report (read-only) |

**Rationale:** Report-only, no data mutation — safe to migrate early. Tests VSAM read + report generation.

### 2B — Data Extract/Load

| # | Program | Composite | Description |
|---|---|---|---|
| 2.3 | CBACT01C | 1.85 | Account VSAM → multi-format output (unblocked by Wave 0.1) |
| 2.4 | CBEXPORT | 1.95 | Export all entities to migration file |
| 2.5 | CBIMPORT | 2.10 | Import migration file → split to VSAM files |

**Rationale:** CBEXPORT and CBIMPORT are the data migration tools — migrate them early to support future data migration testing. CBIMPORT has 10 reference modifications but no CICS.

### 2C — IMS Utility (Batch)

| # | Program | Composite | Description |
|---|---|---|---|
| 2.6 | PAUDBUNL | 1.80 | IMS DL/I unload → sequential file |

**Note:** PAUDBUNL requires IMS adapter/stub in the NestJS layer. Migrate with CBPAUP0C later (Wave 4).

---

## Wave 3 — Financial Batch (High-criticality, Moderate Complexity)

**Goal:** Migrate revenue-critical batch jobs once batch patterns are proven from Wave 2.

| # | Program | Composite | Description |
|---|---|---|---|
| 3.1 | CBACT04C | 1.85 | **Interest calculation** — applies rates to account balances |
| 3.2 | CBTRN02C | 2.00 | **Transaction posting** — updates account balances, writes TRANSACT-VSAM |

**Rationale:** Both are BC=5 (financial mutation). Migrate after batch infrastructure is proven. Require exact decimal arithmetic (Decimal.js) and transaction management. Test heavily with parallel run (old + new systems producing same results).

**Pre-requisite:** Wave 2 VSAM adapters must be in place.
**Testing requirement:** Run in shadow mode alongside mainframe for at least one billing cycle.

---

## Wave 4 — Simple CICS Screens (Composites 2.00–2.25)

**Goal:** Establish the CICS→React/REST pattern. Start with the simplest read-only screens.

### 4A — Read-Only View Screens

| # | Program | Composite | Description |
|---|---|---|---|
| 4.1 | COTRN01C | 2.00 | Transaction detail view |
| 4.2 | COUSR01C | 2.00 | User security record view |

### 4B — Menu / Navigation

| # | Program | Composite | Description |
|---|---|---|---|
| 4.3 | COMEN01C | 2.00 | Main menu (regular users) |
| 4.4 | COADM01C | 2.00 | Admin menu |

### 4C — Simple CRUD Screens

| # | Program | Composite | Description |
|---|---|---|---|
| 4.5 | COUSR02C | 2.00 | User add |
| 4.6 | COUSR03C | 2.00 | User delete |
| 4.7 | COUSR00C | 2.25 | User list (VSAM browse) |

**Rationale:** User management (COUSR*) forms a cohesive NestJS module. Migrate as a unit. The VSAM browse pattern in COUSR00C establishes pagination patterns for later screens.

---

## Wave 5 — Authentication & Moderate CICS Screens (Composites 2.10–2.70)

**Goal:** Migrate authentication and mid-complexity screens once CICS→REST pattern is established.

| # | Program | Composite | Description |
|---|---|---|---|
| 5.1 | COSGN00C | 2.10 | Signon/authentication screen |
| 5.2 | COACTVWC | 2.70 | Account view (read-only) |
| 5.3 | COTRN00C | 2.40 | Transaction list (bidirectional VSAM browse) |

**Security note (COSGN00C):** The application uses application-level credential checking against USRSEC VSAM. The NestJS replacement must integrate with a proper identity provider (NestJS Guards + Passport JWT, or OAuth2). The VSAM user table migrates to a `users` table in PostgreSQL.

---

## Wave 6 — DB2/MQ Variants & Authorization IMS Programs (Composites 2.15–2.80)

**Goal:** Migrate variant modules requiring non-VSAM backends.

### 6A — DB2 CICS Variants (transaction-type-db2)

| # | Program | Composite | Description |
|---|---|---|---|
| 6.1 | COTRTUPC | 2.30 | Transaction type update (DB2) |
| 6.2 | COTRTLIC | 2.45 | Transaction type list (DB2 cursor) |

**Rationale:** Straightforward DB2 CRUD; COTRTLIC cursor maps to a TypeORM repository query.

### 6B — MQ Variants (vsam-mq)

| # | Program | Composite | Description |
|---|---|---|---|
| 6.3 | COACCT01 | 2.80 | Account inquiry with MQ publish |
| 6.4 | CODATE01 | 2.45 | CICS START/RETRIEVE async date service |

**Note:** CODATE01's CICS START pattern maps to a BullMQ job + Kafka/RabbitMQ. COACCT01's MQ PUT maps to a NestJS microservice client publishing to the outbound queue.

### 6C — IMS Authorization Batch + CICS (authorization-ims-db2-mq)

| # | Program | Composite | Description |
|---|---|---|---|
| 6.5 | CBPAUP0C | 2.15 | Batch payment authorization (IMS DL/I) |
| 6.6 | COPAUS2C | 2.80 | Auth confirmation screen (IMS + DB2) |
| 6.7 | COPAUS1C | 2.80 | Auth setup variant 1 (IMS) |
| 6.8 | COPAUA0C | 2.65 | Auth inquiry screen (IMS) |
| 6.9 | COPAUS0C | 2.65 | Auth setup management (IMS) |

**IMS note:** All IMS programs call CBLTDLI (IBM DL/I call interface). TypeScript replacement requires either an IMS connector bridge (IBM IMS Universal Drivers via JNI/native bridge) or full IMS-to-PostgreSQL data migration first.

---

## Wave 7 — Complex CICS Screens with Financial Logic (Composites 2.80–3.00)

**Goal:** Migrate high-value transactional screens with financial business logic.

| # | Program | Composite | Description |
|---|---|---|---|
| 7.1 | COCRDSLC | 2.80 | Card select/search screen |
| 7.2 | COBIL00C | 2.90 | **Bill payment** (financial transaction) |
| 7.3 | COTRN02C | 2.90 | **Transaction add** (financial transaction creation) |
| 7.4 | CORPT00C | 3.00 | Report menu (CICS START → batch) |

**COBIL00C special:** VSAM alternate index (CXACAIX) requires modeling as a composite key in PostgreSQL. Payment posting must be wrapped in a TypeORM `dataSource.transaction(...)` (or `@Transaction()`) block.

**CORPT00C special:** CICS START pattern must be replaced with a job trigger mechanism (BullMQ producer + REST endpoint, or Kafka event to trigger a batch consumer).

---

## Wave 8 — Hard Programs (Composites 3.00–3.85)

**Goal:** Migrate the most complex programs. Requires experienced team with full platform context.

### 8A — Statement Generation (migrate as pair)

| # | Program | Composite | Description |
|---|---|---|---|
| 8.1 | CBSTM03B | 2.30 | File I/O subroutine (migrate with CBSTM03A) |
| 8.2 | CBSTM03A | 3.00 | **Account statement generation** (ALTER/POINTER) |

**CBSTM03A is a manual rewrite candidate.** The ALTER statements and POINTER-based MVS control block addressing cannot be translated automatically. Approach:
1. Understand the business logic (statement formatting, line-item accumulation, HTML/text rendering)
2. Rewrite as a TypeScript report generator (e.g., Handlebars/EJS templates for HTML, plain template literals for text)
3. The file I/O dispatcher (CBSTM03B) becomes unnecessary — replace 4-file VSAM access with TypeORM queries

### 8B — Card List/Update

| # | Program | Composite | Description |
|---|---|---|---|
| 8.3 | COCRDLIC | 3.30 | Card list (VSAM browse, 16 GO TO) |
| 8.4 | COCRDUPC | 3.40 | **Card update** (21 GO TO, 8 REDEFINES) |

**Approach:** COCRDLIC and COCRDUPC share data structures — migrate together. The 8 REDEFINES in COCRDUPC require careful TypeScript discriminated-union / interface hierarchy design.

### 8C — Account Update (final, most complex)

| # | Program | Composite | Description |
|---|---|---|---|
| 8.5 | COACTUPC | 3.85 | **Account update** (51 GO TO, 43 REDEFINES, 4236 lines) |

**COACTUPC strategy:**
1. This program is a **manual rewrite candidate** — 51 GO TO statements make automated translation unreliable
2. Extract the business validation rules first (state/ZIP lookup → database table; field validation → class-validator decorators on DTOs)
3. SYNCPOINT → `dataSource.transaction(...)` (or `@Transaction()`) on the update service method
4. CSLKPCDY (1,318-line lookup) → database reference table or TypeScript const map backed by DB
5. CSSETATY COPY REPLACING×39 → React form field components with validation states
6. Estimate: largest single migration task in the project — allocate 3–5 sprints

---

## Wave Summary

| Wave | Programs | Composite Range | Effort | Key Deliverable |
|---|---|---|---|---|
| 0 | 3 (incl. 2 assembler) | prereqs | Low | TypeScript utility modules |
| 1 | 7 | 1.35–1.60 | Low | Batch patterns, DB2 patterns |
| 2 | 6 | 1.55–2.10 | Low-Medium | Batch infrastructure, data migration tools |
| 3 | 2 | 1.85–2.00 | Medium-High | Financial batch (shadow run required) |
| 4 | 7 | 2.00–2.25 | Medium | CICS→REST pattern, user management module |
| 5 | 3 | 2.10–2.70 | Medium | Auth, account view, transaction browse |
| 6 | 9 | 2.15–2.80 | Medium-High | IMS, MQ, DB2 variant modules |
| 7 | 4 | 2.80–3.00 | High | Financial CICS transactions |
| 8 | 5 | 2.30–3.85 | Very High | Complex programs, manual rewrites |
| **Total** | **46** | | | |

---

## Critical Path

The following programs are on the critical path due to dependencies:

```
COBDATFT (Assembler)
    └── CBACT01C (Wave 2)

MVSWAIT (Assembler)
    └── COBSWAIT (Wave 1)

CSUTLDTC (Wave 0)
    ├── CORPT00C (Wave 7)
    └── COTRN02C (Wave 7)

CBSTM03B (Wave 8) → must be migrated before or with CBSTM03A

COSGN00C (Wave 5) → must be in place before any authenticated screen works

COMEN01C / COADM01C (Wave 4) → entry-point navigation hubs
```

---

## Proof-of-Concept Recommendation

Before committing to full migration, implement a PoC using **Wave 4A (COTRN01C)** as the target:

- Simple CICS READ → NestJS `@Controller` `@Get` endpoint
- BMS screen map → React form component
- VSAM TRANSACT record → TypeORM `Transaction` entity
- COMMAREA → request DTO + JWT session state

This validates the full stack (COBOL→TypeScript→React) on the simplest representative program before investing in harder migrations.
