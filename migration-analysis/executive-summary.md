# Executive Summary — CardDemo Migration Assessment

**Date:** 2026-02-28
**Audience:** Executive Leadership

---

## What We Are Migrating

The AWS CardDemo is a credit card management system running on an IBM mainframe. It
processes bill payments, account management, transaction posting, interest calculation,
and customer management. The system is written in COBOL and runs on CICS (online
transactions) and batch JCL jobs.

**Scale:** 44 COBOL programs, 20,650 lines of core code, 8 VSAM data files,
17 online screens, 38 batch jobs.

**Target:** TypeScript 5 + NestJS 10 (on Bun) + TypeORM + PostgreSQL + GraphQL + React —
a modern cloud-native stack deployable on AWS.

---

## What We Found

### The Good News

- **No program is extremely complex.** On our 1–5 difficulty scale, the hardest
  program scores 3.85. No programs hit 4.0 or above.
- **47% of programs are easy** to translate (score < 2.0). These can be handled with
  AI-assisted translation and light review.
- **The data model is clean.** All 8 VSAM files map directly to relational tables.
  The entity relationships (customers, accounts, cards, transactions) are clear.
- **Only 3% dead code** — this is a clean, modern demo application without decades
  of accumulated technical debt.

### The Risks

- **2 programs require manual rewrite**, not translation: CBSTM03A (uses deprecated
  assembler-level control flow) and COACTUPC (4,236 lines; 51 branching statements).
  These are the most expensive items in the migration.
- **3 critical security violations** exist today and must be fixed independently of
  migration timeline:
  1. **Hardcoded FTP credentials** in `FTPJCL.JCL` (High — credentials in source code)
  2. **Plaintext passwords** in user security file (Critical — PCI DSS violation)
  3. **CVV card codes stored permanently** in card file (Critical — PCI DSS 3.3 violation)
- **4 financial programs** require parallel validation (run both mainframe and the
  NestJS service simultaneously, compare results) before cutover can be authorized.

---

## Recommended Approach

**AI-Assisted Rewrite using the Strangler Fig pattern.**

We do NOT recommend a big-bang replacement. Instead:

1. **Build NestJS/TypeScript services in parallel** alongside the running mainframe
2. **Migrate one transaction at a time** — flip routing from mainframe to the NestJS
   service as each is validated
3. **Keep mainframe running** until all transactions are verified in the new stack
4. **Decommission mainframe** only when 30 days of parallel operation confirm zero
   financial discrepancies

This approach eliminates the risk of a single large cutover event. Any problem
discovered after go-live can be rolled back in seconds by re-routing that transaction
back to the mainframe.

---

## Migration Phases

| Phase | What Gets Migrated | Risk Level |
|---|---|---|
| Phase 0 | Infrastructure only (no COBOL programs yet) | Low |
| Phase 1–2 | Simple batch programs (data readers, reports) | Low |
| Phase 3 | Financial batch (interest calculation, transaction posting) — **parallel run required** | High |
| Phase 4–5 | Online screens (user management, account view, navigation) | Medium |
| Phase 6 | Optional variant modules (IMS authorization, MQ, DB2) | High |
| Phase 7 | Financial online transactions (bill payment, transaction creation) — **parallel run required** | High |
| Phase 8 | Most complex programs (manual rewrites) | Very High |

---

## Sizing (No Calendar Estimates)

We do not provide calendar estimates — translation speed depends on team skill and
testing requirements that vary 10× across organizations. We provide these objective
metrics instead:

| Migration Unit | Count | Notes |
|---|---|---|
| Easy programs (≤2.0 score) | 22 | Suitable for AI-assisted translation |
| Moderate programs (2.0–3.0 score) | 20 | AI translation + senior developer review |
| Hard programs (3.0–4.0 score) | 5 | Manual refactoring required |
| Programs requiring parallel run | 4 | CBTRN02C, CBACT04C, COBIL00C, COTRN02C |
| Manual rewrites | 2 | CBSTM03A, COACTUPC (largest effort items) |
| VSAM files → PostgreSQL tables | 8 | Data migration with EBCDIC conversion |
| BMS screens → React components | 17 | UI rebuild |

Your engagement lead will multiply these by your team's velocity to produce a project
schedule.

---

## Immediate Actions Required

Regardless of migration timeline, these actions must be taken **now**:

1. **Remove FTPJCL.JCL credentials from source control** or rotate them immediately.
2. **Engage PCI QSA** to review CVV storage and plaintext password findings.
3. **Obtain IMS database schema** from operations team (required for authorization
   variant migration, currently missing from the codebase).
4. **Confirm COCRDSEC/CDV1** — a CSD transaction entry with no source code. If this
   transaction is enabled in production, it causes a CICS crash on entry.

---

## What Success Looks Like

After migration:
- Credit card management runs on AWS in TypeScript/NestJS + PostgreSQL — no mainframe dependency
- Modern React UI replaces 3270 green-screen terminals
- GraphQL/REST APIs replace CICS transaction codes
- Passwords stored with bcrypt hashing (industry standard)
- CVV not stored at all (PCI compliance)
- SSN encrypted at rest
- All financial calculations produce results identical to the mainframe (verified by
  parallel run)

---

*Full technical details in `migration/assessment-report.md`*

*Assessment Lead — CardDemo Mainframe Migration Project — 2026-02-28*
