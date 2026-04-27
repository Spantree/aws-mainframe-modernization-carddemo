# Technology Decisions — CardDemo Migration Target Stack

**Date:** 2026-02-28
**Audience:** Technical leadership, architects, development team

---

## Target Stack Overview

| Layer | Technology | Version | Replaces |
|---|---|---|---|
| Language | Java | 21 (LTS) | COBOL |
| Application framework | Spring Boot | 3.x | CICS transaction runtime |
| Batch processing | Spring Batch | 5.x | JCL jobs |
| API layer | Spring for GraphQL | 1.x | CICS COMMAREA / transaction codes |
| REST (where GraphQL is overkill) | Spring MVC / WebMVC | 6.x | Direct CICS return |
| Database | PostgreSQL | 15+ | VSAM KSDS files |
| ORM | Spring Data JPA + Hibernate | 6.x | COBOL file declarations |
| Security | Spring Security + JWT | 6.x | USRSEC VSAM + COSGN00C |
| UI | React | 18+ (TypeScript) | BMS 3270 screen maps |
| GraphQL client | Apollo Client | 3.x | N/A |
| Testing | JUnit 5 + Testcontainers | — | (no existing tests) |
| Build | Gradle | 8.x | JCL compile procedures |
| Deployment | Docker + AWS ECS / EKS | — | Mainframe LPAR |

---

## Decision Rationale

### Java 21 (LTS)

**Why:** Java 21 is the current Long-Term Support release with production readiness.
Specific Java 21 features map directly to COBOL patterns:

| Java 21 Feature | Replaces COBOL Pattern | Example |
|---|---|---|
| `sealed interface` + `record` | `REDEFINES` discriminated unions | CVEXPORT 5-way REDEFINES → sealed `ExportRecordData` |
| `record` types | COBOL copybook layouts | CVCUS01Y → `CustomerRecord` |
| `switch` expressions | EVALUATE/WHEN chains | Transaction type dispatch |
| Virtual threads (Project Loom) | CICS pseudo-conversational | High-concurrency CICS workloads |
| `java.time` (LocalDate, etc.) | PIC X(10) date fields | All YYYY-MM-DD fields |
| `BigDecimal` arithmetic | PIC S9(10)V99 financial fields | **Never float/double** |

**Not Java 17 or 11:** The `sealed interface` pattern is essential for REDEFINES
mapping (particularly CVEXPORT.cpy). Java 21's virtual threads also handle the
CICS pseudo-conversational workload pattern efficiently.

---

### Spring Boot 3.x

**Why:** Spring Boot 3 (requires Java 17+, recommends 21) is the current production
standard. It provides the dependency injection, transaction management, and
observability needed for a mainframe-grade application.

Key Spring Boot modules used:

| Module | Used For | Replaces |
|---|---|---|
| `spring-boot-starter-web` | REST controllers for CICS transaction mapping | CICS RETURN TRANSID |
| `spring-boot-starter-batch` | JCL job replacement | CBTRN02C, CBACT04C, CBSTM03A, etc. |
| `spring-boot-starter-data-jpa` | VSAM → PostgreSQL access | COBOL FILE SECTION declarations |
| `spring-boot-starter-security` | Authentication + authorization | COSGN00C + USRSEC VSAM |
| `spring-boot-starter-graphql` | COMMAREA → typed API | COCOM01Y COMMAREA structure |
| `spring-boot-starter-actuator` | Health checks + metrics | Mainframe job monitoring |

---

### Spring Batch 5.x

**Why:** Spring Batch is the industry standard for Java batch processing. Its job/step
model directly mirrors the COBOL batch paradigm.

| JCL / COBOL Concept | Spring Batch Equivalent |
|---|---|
| JCL job (EXEC PGM=) | `Job` with `Step` definitions |
| COBOL PERFORM loop over file | `ItemReader` → `ItemProcessor` → `ItemWriter` |
| GDG generation naming | Spring Batch `JobParameters` with generation counters |
| ABEND / restart | Spring Batch `JobExecutionListener` + restart from checkpoint |
| JCL PARM= values | `JobParameters` passed at launch |
| SORT utility step | Spring Batch `SortingItemReader` or custom comparator |

**GDG ordering** (POSTTRAN→INTCALC→COMBTRAN→TRANREPT) is enforced via Spring Batch
`JobStep` dependencies or AWS Step Functions orchestration — not implicit like GDG.

---

### GraphQL (Spring for GraphQL)

**Why:** The CICS COMMAREA pattern passes a complex session state structure between
programs. GraphQL's typed schema and query/mutation model maps naturally to this:

| CICS Concept | GraphQL Equivalent |
|---|---|
| DFHCOMMAREA (COCOM01Y) | GraphQL operation context + JWT claims |
| CICS transaction code (CA00, CT01, etc.) | GraphQL query or mutation name |
| BMS SEND MAP output | GraphQL query response type |
| BMS RECEIVE MAP input | GraphQL mutation input type |
| EXEC CICS XCTL (navigation) | GraphQL subscription + React router navigation |

**When to use REST instead:** Simple read-only queries (transaction detail view,
account view) can use REST GET endpoints. Use GraphQL for complex operations
with multiple related entities (account + customer + cards + transactions).

**If GraphQL adoption risk is high:** Use Spring MVC REST throughout. The schema
can be added later. Do not block migration on GraphQL learning curve.

---

### PostgreSQL 15+

**Why:** PostgreSQL maps directly to the VSAM KSDS data model and provides the
relational features missing from VSAM:

| VSAM Feature | PostgreSQL Equivalent |
|---|---|
| KSDS primary key | `PRIMARY KEY` column + B-tree index |
| KSDS alternate index (CXACAIX) | Secondary B-tree index on `card_xref_record.xref_acct_id` |
| VSAM BROWSE (STARTBR/READNEXT) | `SELECT ... ORDER BY key LIMIT n OFFSET m` or keyset pagination |
| REWRITE (in-place update) | `UPDATE ... WHERE key = ?` |
| File status codes (23 = NOTFND) | `Optional<T>` from `findById()` |
| Sequential file (DALYTRAN) | Staging table or Kafka topic |
| GDG datasets | Partitioned tables by date, or append-only tables |

**Financial data precision:**
- `PIC S9(10)V99` → `NUMERIC(12,2)` — exact, no rounding
- **Never use `FLOAT` or `DOUBLE PRECISION` for monetary fields**
- Interest rates (`PIC S9(4)V99`) → `NUMERIC(6,2)`

**Security extensions:**
- `pgcrypto`: column-level encryption for SSN, govt ID
- Row Security Policies (RLS): restrict PII access by role
- `pg_audit`: audit logging for PCI DSS compliance

**Deployment:** AWS RDS for PostgreSQL (managed) or Amazon Aurora PostgreSQL
(higher availability). Use Multi-AZ for production.

---

### Spring Security + JWT

**Why:** COSGN00C performs application-level authentication against USRSEC VSAM with
no RACF or SSO integration. The Java replacement must implement industry-standard
authentication:

| COBOL Security Pattern | Spring Security Replacement |
|---|---|
| COSGN00C reads USRSEC VSAM | `UserDetailsService` reads `sec_user_data` table |
| `SEC-USR-PWD PIC X(08)` plaintext | BCrypt-hashed `VARCHAR(72)` password column |
| COMMAREA carries user type (A/U) | JWT claim `user_type` in token |
| EXEC CICS RETURN TRANSID → session maintained by COMMAREA | JWT token in HTTP Authorization header |
| CICS HANDLE ABEND → application auth check | `@PreAuthorize("hasRole('ADMIN')")` |

**Password migration:** All USRSEC VSAM passwords must be hashed with BCrypt
(cost ≥12) or Argon2id during data migration. Options:
1. Hash existing passwords → users login transparently (if passwords were cleartext)
2. Force password reset on first login (safer if encoding unknown)

**Identity provider consideration:** For production, integrate with an external IdP
(Keycloak, AWS Cognito, Okta) rather than storing passwords in PostgreSQL directly.
Spring Security's OAuth2 resource server support makes this a configuration change.

---

### React 18 + TypeScript

**Why:** The 17 BMS mapsets define the terminal screen layout for all CICS programs.
React replaces these with modern browser-based UI.

| BMS Concept | React Equivalent |
|---|---|
| BMS mapset (COACTUP) | React component (`AccountEditForm.tsx`) |
| BMS field with attributes | React form field with validation state |
| CSSETATY COPY REPLACING×39 | React controlled input with `useState` + Yup validation |
| BMS SEND MAP → terminal | React state update → re-render |
| BMS RECEIVE MAP ← keyboard | React form `onSubmit` handler |
| EXEC CICS XCTL (navigation) | React Router `<Link>` or `navigate()` |
| COCOM01Y COMMAREA user context | React Context or Redux user state |

**TypeScript over JavaScript:** The COBOL data structures (copybooks) are strongly
typed. TypeScript interfaces map directly to the Java record types generated from
copybooks, providing end-to-end type safety.

**Component mapping to BMS mapsets:**

| BMS Mapset | React Component |
|---|---|
| COSGN00 | `SignOnForm` |
| COMEN01 | `MainMenu` |
| COADM01 | `AdminMenu` |
| COACTUP | `AccountEditForm` |
| COACTVW | `AccountDetail` |
| COBIL00 | `BillPaymentForm` |
| COCRDLI | `CardList` (paginated) |
| COCRDSL | `CardSearch` |
| COCRDUP | `CardEditForm` |
| CORPT00 | `ReportRequestForm` |
| COTRN00 | `TransactionList` (paginated) |
| COTRN01 | `TransactionDetail` |
| COTRN02 | `TransactionForm` |
| COUSR00 | `UserList` (admin only) |
| COUSR01 | `UserDetail` |
| COUSR02 | `UserForm` |
| COUSR03 | `UserDeleteConfirm` |

---

### Testing Stack

| Tool | Purpose |
|---|---|
| JUnit 5 | Unit tests for all translated programs |
| Mockito | Mock repositories/services in unit tests |
| Testcontainers | Real PostgreSQL in Docker for integration tests |
| Spring Boot Test | `@SpringBootTest` integration test slices |
| Cypress | End-to-end React UI testing |
| GnuCOBOL | Reference COBOL execution for dual-harness testing |
| custom diff tool | Output comparison between COBOL and Java |

---

## Decisions NOT Made (Discovery Questions)

These decisions require client input before migration begins:

| Question | Options | Impact |
|---|---|---|
| Are variant modules (IMS/DB2/MQ) in scope? | Yes / No / Partial | Adds 13 programs (9,525 LOC) to scope |
| Target deployment: containers or serverless? | ECS Fargate / EKS / Lambda | Affects Spring Batch scheduling design |
| Identity provider: self-hosted or managed? | Keycloak / AWS Cognito / Okta | Affects COSGN00C migration strategy |
| Message broker for async patterns: | Kafka / Amazon SQS / RabbitMQ | Required for CORPT00C and CODATE01 |
| Report output format: PDF or browser-based? | iText / JasperReports / React | Affects CBSTM03A replacement design |
| GraphQL vs REST for API layer? | Spring for GraphQL / Spring MVC | Affects COMMAREA migration pattern |

---

*See `migration/assessment-report.md` for full context.*
