# Technology Decisions — CardDemo Migration Target Stack

**Date:** 2026-02-28 (revised for TypeScript/NestJS target)
**Audience:** Technical leadership, architects, development team

---

## Target Stack Overview

| Layer | Technology | Version | Replaces |
|---|---|---|---|
| Language | TypeScript | 5.x | COBOL |
| Runtime | Bun | 1.x | (replaces Node.js for speed) |
| Application framework | NestJS | 10.x | CICS transaction runtime |
| Batch processing | BullMQ + NestJS Schedule | — | JCL batch jobs |
| API layer | NestJS controllers + GraphQL | — | CICS COMMAREA / transaction codes |
| Database | PostgreSQL | 15+ | VSAM KSDS files |
| ORM | TypeORM | 0.3.x | COBOL file declarations |
| Security | NestJS Guards + JWT | — | USRSEC VSAM + COSGN00C |
| UI | React + TypeScript | 18+ | BMS 3270 screen maps |
| Build | Bun workspaces | — | JCL compile procedures |
| Testing | Bun test + Supertest | — | (no existing tests) |
| Deployment | Docker + AWS ECS | — | Mainframe LPAR |

---

## Decision Rationale

### TypeScript

TypeScript provides static typing for the data-heavy patterns in CardDemo. COBOL copybook structures (fixed-width fields, COMP-3 packed decimal, REDEFINES) map cleanly to TypeScript interfaces and TypeORM entities. The type system catches at compile time the class of errors that silent packed-decimal mishandling causes at runtime.

### Bun

Bun replaces Node.js as the runtime and package manager. It is API-compatible with Node.js, runs TypeScript natively without a compilation step, and is measurably faster for I/O-bound workloads. For a migration project where the development loop is the bottleneck, faster test runs and startup times reduce iteration cost.

### NestJS

NestJS provides the module, controller, and service architecture that maps well onto COBOL's paragraph and section structure. A COBOL program becomes a NestJS module. Paragraphs become service methods. CICS transaction boundaries become NestJS transaction decorators via TypeORM's `@Transaction()` support. The dependency injection system handles the copybook-level shared data structures that COBOL programs share via COPY.

### TypeORM

TypeORM is the ORM of choice for this stack. COBOL copybook PIC clauses become TypeORM column definitions:

```typescript
// COBOL: CARD-ACCT-ID    PIC 9(11) COMP-3
@Column({ type: 'decimal', precision: 11, scale: 0 })
cardAccountId: Decimal;

// COBOL: CARD-ACTIVE-STATUS PIC X(01)
@Column({ type: 'char', length: 1 })
cardActiveStatus: string;
```

VSAM KSDS files with primary and alternate keys become TypeORM entities with primary key and unique index columns. MU/PE fields (periodic groups) that appear in some variants become child tables with foreign key references.

### Decimal.js for COMP-3 / Packed Decimal

COBOL COMP-3 fields that perform financial arithmetic must use a decimal library, not native JavaScript floats. Native floats will produce incorrect results for financial calculations. Decimal.js provides arbitrary-precision arithmetic with explicit rounding modes that match COBOL's ROUNDED behavior.

```typescript
// COBOL: COMPUTE WS-BALANCE = WS-PRINCIPAL * WS-RATE / 100
const balance = principal.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
```

### BullMQ for Batch Jobs

COBOL batch JCL jobs become BullMQ job queues. Each JCL step becomes a BullMQ processor. JCL DD statement dependencies (one step's SYSOUT feeds the next step's SYSIN) become queue chaining. The existing JCL job sequence maps to BullMQ's `Flow` API for parent-child job dependencies.

### React for BMS Screens

BMS screen map definitions (.bms files) are parsed to extract field names, positions, attributes (protected, numeric, autoskip), and PF key assignments. Each BMS map becomes a React component. Protected fields become read-only inputs. Numeric fields get `type="number"` and appropriate decimal validation. PF key assignments become button handlers or keyboard shortcuts.

---

## COMP-3 Migration Mapping

All COMP-3 fields are converted to `Decimal` type using Decimal.js at the service boundary. Database storage uses PostgreSQL `NUMERIC(p, s)` columns matching the original PIC clause precision.

| COBOL PIC | TypeScript Type | PostgreSQL Column |
|---|---|---|
| `PIC 9(5)V99 COMP-3` | `Decimal` | `NUMERIC(7, 2)` |
| `PIC S9(7)V99 COMP-3` | `Decimal` | `NUMERIC(9, 2)` |
| `PIC S9(11) COMP-3` | `Decimal` | `NUMERIC(11, 0)` |
| `PIC 9(18)V99 COMP-3` | `Decimal` | `NUMERIC(20, 2)` |

---

## GO TO Elimination Strategy

COBOL GO TO statements are eliminated by converting branching patterns to structured TypeScript control flow:

- Simple forward GOTOs → early return or labeled break
- Loop constructs (GOTO with a loop-back label) → `while` or `for` loops  
- Exit paragraphs (GOTO to the last paragraph) → `return`
- Complex branching (GOTO into a different paragraph mid-flow) → refactored into separate service methods called explicitly

Programs with more than 20 GO TO statements (COACTUPC: 51, CBSTM03A: 13) are flagged for human specialist review before automated translation proceeds.

---

## Data Model

See `data-model.md` for the full VSAM-to-PostgreSQL mapping and TypeORM entity definitions.

---

## Migration Tools Used

- **tree-sitter-cobol-enterprise** — custom tree-sitter grammar for IBM Enterprise COBOL with typed EXEC CICS/SQL AST nodes. Used for all parsing and static analysis.
- **Claude (Anthropic)** — LLM-assisted documentation generation and idiomatic TypeScript refactoring from mechanically translated output.
- **Decimal.js** — arbitrary-precision decimal arithmetic for COMP-3 field handling.
- **TypeORM** — entity generation from copybook PIC clause analysis.
