# CardDemo Hub Copybooks — Change Impact Analysis

**Generated:** 2026-02-28
**Purpose:** Identify the highest-impact copybooks for migration planning. A change to any hub copybook propagates to all consumers — this determines migration risk and sequencing.

---

## Overview

| Rank | Copybook | Consumers | Lines | Category | Change Risk |
|------|----------|----------:|------:|----------|-------------|
| 1 | COCOM01Y | 26 | 47 | CICS Commarea | CRITICAL |
| 2 | DFHBMSCA | 19 | — | IBM-supplied | FLAG (do not change) |
| 3 | DFHAID | 19 | — | IBM-supplied | FLAG (do not change) |
| 4 | COTTL01Y | 18 | 27 | Screen Header | HIGH |
| 5 | CSDAT01Y | 17 | 58 | Date Storage | HIGH |
| 6 | CSUSR01Y | 17 | 26 | User Context | HIGH |
| 7 | CSMSG01Y | 17 | 24 | Screen Messages | HIGH |
| 8 | CVACT03Y | 15 | 11 | Entity Record | HIGH |
| 9 | CVACT01Y | 12 | 20 | Entity Record | HIGH |
| 10 | CVTRA05Y | 10 | 21 | Entity Record | HIGH |
| 11 | CVCUS01Y | 7 | 26 | Entity Record | MEDIUM |
| 12 | CVACT02Y | 5 | 14 | Entity Record | MEDIUM |
| 13 | CSUTLDPY | 4 | 375 | Inline Procedures | MEDIUM |
| 14 | CVTRA06Y | 2 | 21 | Input Record | LOW |
| 15 | CVCRD01Y | 2 | 46 | Screen Data | LOW |
| 16 | CSMSG02Y | 2 | 35 | Screen Messages | LOW |
| 17 | CSUTLDWY | 2 | 89 | Date WS | LOW |
| 18 | CVEXPORT | 2 | 103 | Migration Record | LOW |
| 19 | CSSTRPFY | 0 | 85 | String Parse WS | DEAD CODE |
| 20 | UNUSED1Y | 0 | 10 | Stub | DEAD CODE |

---

## 1. COCOM01Y — CRITICAL (26 consumers)

**File:** `app/cpy/COCOM01Y.cpy`
**Lines:** 47
**Level-01:** `CARDDEMO-COMMAREA`
**Purpose:** CICS DFHCOMMAREA layout — the shared communication area passed between ALL CICS programs via EXEC CICS XCTL/LINK COMMAREA.

### Contents
```
01 CARDDEMO-COMMAREA.
   05 CDEMO-FROM-TRANID     PIC X(4)   — originating transaction
   05 CDEMO-FROM-PROGRAM    PIC X(8)   — originating program name
   05 CDEMO-PGM-CONTEXT     PIC 9(9)   — application context code
   05 CDEMO-MENU-OPT-NUM    PIC 9(2)   — selected menu option
   05 CDEMO-USER-ID         PIC X(8)   — logged-in user ID
   05 CDEMO-USER-TYPE       PIC X(1)   — 'R'=regular, 'A'=admin
   05 CDEMO-LAST-ACTION     PIC X(2)   — last CICS action
   05 CDEMO-ACCT-ID         PIC 9(11)  — current account ID
   05 CDEMO-CARD-NUM        PIC X(16)  — current card number
   05 CDEMO-TRAN-ID-IN      PIC X(16)  — current transaction ID
```

### Consumers (all 26)
**Core CICS (17):** COACTUPC, COACTVWC, COADM01C, COBIL00C, COCRDLIC, COCRDSLC, COCRDUPC, COMEN01C, CORPT00C, COSGN00C, COTRN00C, COTRN01C, COTRN02C, COUSR00C, COUSR01C, COUSR02C, COUSR03C
**MQ Variants (2):** COACCT01, CODATE01
**DB2 Variants (2):** COTRTLIC, COTRTUPC
**IMS Variants (5):** CBPAUP0C, COPAUA0C, COPAUS0C, COPAUS1C, COPAUS2C

### Change Impact
Any modification to this record structure invalidates the binary interface between all 26 programs simultaneously. CICS COMMAREA is passed as raw bytes — field offsets matter absolutely.

### Migration Approach
- Replace with a TypeScript DTO / session object: `CardDemoSession`
- Fields map to JWT claims for stateless sessions, or a NestJS-managed session
  (e.g. `express-session`) when server-side state is required
- All 26 XCTL program boundaries become HTTP API calls with session context
- **This is the #1 migration coordination point** — the session API contract

---

## 2–3. DFHBMSCA + DFHAID — IBM-Supplied (19 consumers each)

**Source:** IBM CICS — not in `app/cpy/` (provided by CICS at compile time)
**Purpose:**
- **DFHBMSCA:** BMS screen attribute byte definitions (color, intensity, protection, MDT bit)
- **DFHAID:** Attention Identifier (AID) key codes (DFHENTER, DFHPF1–PF24, DFHCLEAR, etc.)

### Consumers (all 19)
All 17 core CICS programs + COTRTLIC + COTRTUPC

### Change Impact
**Cannot change** — IBM-supplied. During migration, these must be mapped to:
- DFHAID → keyboard event handlers in React (Enter key, F-key shortcuts)
- DFHBMSCA → CSS styling attributes for input fields (read-only, required, highlight colors)

### Migration Approach
- DFHAID keys → React keyboard shortcut map: `{DFHENTER: 'Enter', DFHPF3: 'F3', ...}`
- DFHBMSCA attributes → CSS class names: `protected`, `bright`, `dark`, `modified`
- Use a mapping table rather than literal constant substitution

---

## 4. COTTL01Y — HIGH (18 consumers)

**File:** `app/cpy/COTTL01Y.cpy`
**Lines:** 27
**Level-01:** `CARDDEMO-TITLE-DATA`
**Purpose:** Screen title and program name display fields used on every screen's header line.

### Contents
```
01 CARDDEMO-TITLE-DATA.
   05 CARDDEMO-TITLE        PIC X(40)  — application title text
   05 CARDDEMO-PGMNAME      PIC X(8)   — current program name
   05 CARDDEMO-DATE-DISPLAY PIC X(10)  — formatted date MM/DD/YYYY
   05 CARDDEMO-TIME-DISPLAY PIC X(8)   — formatted time HH:MM:SS
```

### Consumers (18)
All 17 core CICS programs + COTRTLIC, COTRTUPC (DB2 variants).

### Change Impact
Adding/removing header fields forces BMS map regeneration for all 18 programs.

### Migration Approach
- Migrate to React common header/layout component: `<AppHeader program={name} date={date} />`
- Date/time formatting moves to TypeScript (in the React component or the NestJS response DTO)

---

## 5. CSDAT01Y — HIGH (17 consumers)

**File:** `app/cpy/CSDAT01Y.cpy`
**Lines:** 58
**Level-01:** `WS-CURRENT-DATE-DATA`
**Purpose:** Working storage for current date/time, populated via EXEC CICS ASKTIME/FORMATTIME at program start.

### Key Fields
- `WS-CURDATE-YEAR`, `WS-CURDATE-MONTH`, `WS-CURDATE-DAY`
- `WS-CURDATE-YYYYMMDD` (formatted)
- `WS-CURTIME-HH`, `WS-CURTIME-MM`, `WS-CURTIME-SS`

### Migration Approach
- Replace with `new Date()` / `Temporal.Now.plainDateTimeISO()` in the NestJS service layer
- Date formatting: date-fns `format(d, 'MM/dd/yyyy')`
- No equivalent copybook needed — each module gets date from a function call

---

## 6. CSUSR01Y — HIGH (17 consumers)

**File:** `app/cpy/CSUSR01Y.cpy`
**Lines:** 26
**Level-01:** `CARDDEMO-USER-DATA`
**Purpose:** Current user security context — user ID and user type, populated from COCOM01Y at program start.

### Key Fields
- `SEC-USR-ID` PIC X(8) — user ID
- `SEC-USR-TYPE` PIC X(1) — 'R' regular / 'A' admin
- `SEC-USR-PWD` PIC X(8) — password (not secure!)

### Migration Approach
- Replace with the NestJS `@CurrentUser()` principal populated by the JWT Passport strategy
- User type 'A'/'R' → role claims used by NestJS `@Roles()` / `RolesGuard`: `ADMIN`, `USER`
- Passwords: the current USRSEC VSAM stores plaintext passwords — **critical security issue to address in migration**

---

## 7. CSMSG01Y — HIGH (17 consumers)

**File:** `app/cpy/CSMSG01Y.cpy`
**Lines:** 24
**Level-01:** `CARDDEMO-MSG-DATA`
**Purpose:** Screen message display working storage — success, error, and informational messages shown on BMS screens.

### Key Fields
- `WS-MESSAGE` PIC X(78) — primary message text
- `WS-MESSAGE-COLOR` PIC X — DFHBMSCA color attribute

### Migration Approach
- Replace with a TypeScript `ApiResponse` DTO with `message` and `messageType` (SUCCESS/ERROR/INFO)
- React: `<Notification message={msg} type={type} />`

---

## 8. CVACT03Y — HIGH (15 consumers)

**File:** `app/cpy/CVACT03Y.cpy`
**Lines:** 11
**Level-01:** `CARD-XREF-RECORD`
**Purpose:** Card-to-account cross-reference record layout — the key join record linking card numbers to accounts.

### Contents (inferred from usage)
```
01 CARD-XREF-RECORD.
   05 XREF-CARD-NUM       PIC 9(16)  — KSDS key
   05 XREF-CUST-ID        PIC 9(9)
   05 XREF-ACCT-ID        PIC 9(11)
```

### Consumers (15)
CBACT03C, CBACT04C, CBEXPORT, CBIMPORT, CBTRN01C, CBTRN02C, CBTRN03C, CBSTM03A, COACTUPC, COACTVWC, COCRDLIC, COCRDSLC, COCRDUPC, COTRN02C, COACCT01

### Change Impact
Widest entity footprint of any record-layout copybook. Maps directly to a PostgreSQL join relationship.

### Migration Approach
- Represents the `card_accounts` join table in PostgreSQL: `(card_num, customer_id, account_id)`
- Eliminating this file as a separate VSAM means JOIN queries replace explicit xref lookups

---

## 9. CVACT01Y — HIGH (12 consumers)

**File:** `app/cpy/CVACT01Y.cpy`
**Lines:** 20
**Level-01:** `ACCOUNT-RECORD`
**Purpose:** Account master record — the primary account entity.

### Consumers (12)
CBACT01C, CBACT04C, CBEXPORT, CBIMPORT, CBTRN01C, CBTRN02C, CBSTM03A, COACTUPC, COACTVWC, COBIL00C, COCRDUPC, COACCT01

### Migration Approach
- Maps to PostgreSQL `accounts` table (see `schema.sql`)
- TypeORM entity: `account.entity.ts`
- GraphQL type: `Account`

---

## 10. CVTRA05Y — HIGH (10 consumers)

**File:** `app/cpy/CVTRA05Y.cpy`
**Lines:** 21
**Level-01:** `TRAN-RECORD`
**Purpose:** Transaction master record layout — the primary transaction entity (stored in TRANSACT KSDS).

### Consumers (10)
CBACT04C, CBEXPORT, CBIMPORT, CBTRN02C, CBTRN03C, COBIL00C, COTRN00C, COTRN01C, COTRN02C, CORPT00C

### Key Fields (inferred)
- `TRAN-ID` PIC 9(16) — KSDS primary key
- `TRAN-TYPE-CD` PIC X(2) — transaction type
- `TRAN-CAT-CD` PIC 9(4) — category code
- `TRAN-SOURCE` PIC X(10)
- `TRAN-DESC` PIC X(100)
- `TRAN-AMT` COMP-3 — amount
- `TRAN-CARD-NUM` PIC 9(16)
- `TRAN-PROC-TS` PIC X(26) — processing timestamp

### Migration Approach
- Maps to PostgreSQL `transactions` table
- TypeORM entity: `transaction.entity.ts`
- GraphQL type: `Transaction`

---

## 11. CVCUS01Y — MEDIUM (7 consumers)

**File:** `app/cpy/CVCUS01Y.cpy`
**Lines:** 26
**Level-01:** `CUSTOMER-RECORD`
**Purpose:** Customer master record layout.

### Consumers (7)
CBCUS01C, CBEXPORT, CBIMPORT, CBTRN01C, COACTUPC, COACTVWC, COACCT01

### Migration Approach
- Maps to PostgreSQL `customers` table
- TypeORM entity: `customer.entity.ts`

---

## 13. CSUTLDPY — MEDIUM (4 consumers)

**File:** `app/cpy/CSUTLDPY.cpy`
**Lines:** 375
**Level-01:** `WS-DATE-PROC-DATA`
**Purpose:** Large date utility — contains inline PERFORM-target paragraphs for CICS date formatting. Used via COPY then PERFORM the embedded paragraphs.

### Consumers (4)
COACTUPC, COACTVWC, CORPT00C, COTRN02C

### Migration Approach
- This is a 375-line inline utility "library" — equivalent to a TypeScript utility module
- Replace with `dateUtils.formatCicsDate(eibTime: Date): string`
- Always used together with CSUTLDWY (working storage companion)

---

## Orphan / Dead Code Copybooks

### CSSTRPFY (0 consumers)

**File:** `app/cpy/CSSTRPFY.cpy`
**Lines:** 85
**Level-01:** `WS-STRING-PARSE-DATA`
**Purpose:** String parsing utility working storage — CONTAINS LOGIC but is included by NO program.

**Status:** Dead code. Built for a string parsing feature that was never wired in.
**Action:** Do not migrate. Flag for dead-code report.

### UNUSED1Y (0 consumers)

**File:** `app/cpy/UNUSED1Y.cpy`
**Lines:** 10
**Level-01:** None (empty stub)
**Purpose:** Empty stub with no content or consumers.

**Status:** Dead code. Placeholder file.
**Action:** Do not migrate.

---

## Migration Sequencing by Copybook Impact

The following order minimizes breakage risk:

1. **Migrate leaf utilities first** (CSUTLDPY, CSUTLDWY, CSDAT01Y) — replace with TypeScript utility modules
2. **Migrate entity records** in this order (widest impact last):
   - CVTRA05Y (10), CVCUS01Y (7), CVACT02Y (5), CVCRD01Y (2) — lower-impact entities
   - CVACT01Y (12), CVACT03Y (15) — higher-impact; coordinate with schema.sql
3. **Migrate screen utilities** (CSMSG01Y, COTTL01Y) — once CICS layer is removed
4. **Migrate CSUSR01Y** — after auth layer is in place
5. **Migrate COCOM01Y last** — after all 26 consumer programs have TypeScript/NestJS equivalents;
   this is the final CICS coupling point to remove

---

## Summary: Key Migration Insights

1. **COCOM01Y is the architectural linchpin** — 26 programs share this COMMAREA. It is the mainframe equivalent of a session/context API. Its migration to a TypeScript session DTO unblocks all other CICS program migrations.

2. **Entity copybooks define the canonical data model** — CVACT01Y, CVACT03Y, CVTRA05Y, CVCUS01Y directly map to PostgreSQL tables (detailed in `schema.sql`). These are already well-normalized.

3. **IBM-supplied copybooks (DFHBMSCA, DFHAID) require no data migration** — they need a behavioral mapping to React keyboard events and CSS attributes.

4. **Two dead copybooks** (CSSTRPFY, UNUSED1Y) confirm there is some dead code in the codebase — see `dead-code.md` for full analysis.

5. **The 375-line CSUTLDPY** is a pseudo-library included inline — a pattern that complicates maintenance; in TypeScript it becomes a proper utility module.
