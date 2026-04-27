# Proof-of-Concept Plan — CardDemo Migration

**Date:** 2026-02-28
**Purpose:** Validate the full COBOL→Java→React translation pipeline before committing
to full migration scope.

---

## Overview

The PoC translates 2 programs — one batch and one CICS — to demonstrate:
1. The translation toolchain works end-to-end
2. The Java output is idiomatic and maintainable (not "COBOL in Java")
3. A test harness confirms bit-for-bit fidelity with the original
4. Team confidence is established before tackling harder programs

**PoC duration estimate:** Short — both programs are in the "Easy" tier.
Complete the PoC before beginning Wave 1 migration.

---

## PoC Program 1: CBCUS01C — Batch Customer Reader

### Selection Rationale

| Attribute | Value |
|---|---|
| Complexity | 1.40 (Easy) |
| Type | Batch COBOL |
| Lines | 178 total, ~130 LOC |
| GO TO count | 0 |
| CICS commands | None |
| File access | CUSTFILE VSAM (sequential read-only) |
| Copybooks | CVCUS01Y (customer record layout) |

CBCUS01C reads the CUSTFILE VSAM sequentially and prints each customer record.
It is the simplest representative batch program — one file in, one file out,
no financial logic, no assembler dependencies.

### What the PoC Demonstrates

1. **VSAM → PostgreSQL data access:** Replace COBOL file declarations with a
   Spring Data JPA `CustomerRepository.findAll()` query.
2. **COBOL record → Java class:** Map `CUSTOMER-RECORD` (CVCUS01Y) to
   `CustomerRecord.java` using the type mappings in `migration/data-model.md`.
3. **Sequential processing → Spring Batch:** Wrap in a `ItemReader<CustomerRecord>` +
   `ItemWriter<String>` Spring Batch step.
4. **CEE3ABD abend handler → @ExceptionHandler:** Replace the IBM LE abend trap
   with a Spring exception handler.

### Expected Java Output

```java
// CustomerRecord.java — from CVCUS01Y
@Data @Builder
public class CustomerRecord {
    private int custId;
    private String custFirstName;
    private String custLastName;
    // ... (see data-model.md for all fields)
}

// CustomerPrintJob.java — replaces CBCUS01C
@Component
public class CustomerPrintTasklet implements Tasklet {
    @Autowired CustomerRepository repo;

    @Override
    public RepeatStatus execute(StepContribution c, ChunkContext ctx) {
        repo.findAll().forEach(customer ->
            System.out.printf("CUSTOMER: %09d  %-25s %-25s%n",
                customer.getCustId(),
                customer.getCustFirstName(),
                customer.getCustLastName())
        );
        return RepeatStatus.FINISHED;
    }
}
```

### Test Harness

1. **GnuCOBOL reference run:** Compile CBCUS01C.cbl with GnuCOBOL, run against
   test CUSTFILE data, capture output to `cbcus01c-reference.txt`
2. **Java test run:** Run CustomerPrintJob against same data loaded into PostgreSQL
   test database (Testcontainers), capture output to `cbcus01c-java.txt`
3. **Diff:** `diff cbcus01c-reference.txt cbcus01c-java.txt` must produce zero
   differences (accounting for whitespace normalization if needed)

### Acceptance Criteria

- [ ] Java program produces identical output to COBOL for all 10 test customer records
- [ ] Java program produces identical output for edge cases: customer with no middle name,
      customer with max-length name fields, customer with FICO score = 300 and 850
- [ ] Unit test coverage ≥ 90%
- [ ] Code reviewed by senior Java developer — idiomatic (no `goto`, no global state)

---

## PoC Program 2: COTRN01C — CICS Transaction Detail View

### Selection Rationale

| Attribute | Value |
|---|---|
| Complexity | 2.00 (Moderate) |
| Type | CICS Online |
| Lines | 330 total, ~231 LOC |
| GO TO count | 0 |
| CICS commands | READ, SEND MAP, RECEIVE MAP, RETURN, XCTL, HANDLE ABEND |
| Transaction ID | CT01 |
| Files | TRANSACT VSAM (READ) |
| BMS Mapset | COTRN01 (CTRN1A) |
| Copybooks | COCOM01Y, COTRN01 (BMS), COTTL01Y, CSDAT01Y, CSMSG01Y, CSUSR01Y, CVTRA05Y |

COTRN01C displays a single transaction record given a transaction ID passed via COMMAREA.
It is the simplest representative CICS online program — one VSAM read, one BMS screen
send. No financial mutation, no complex navigation, no GO TO statements.

### What the PoC Demonstrates

1. **CICS COMMAREA → JWT/session:** COCOM01Y COMMAREA (user context, selected transaction
   ID) → JWT claims passed as HTTP headers or URL path parameter.
2. **EXEC CICS READ → JPA:** `EXEC CICS READ DATASET('TRANSACT') RIDFLD(tran-id)`
   → `TransactionRepository.findById(tranId)` with NOTFND handling.
3. **BMS SEND MAP → React:** COTRN01 BMS mapset → `TransactionDetail.tsx` React
   component receiving a GraphQL query result.
4. **EXEC CICS RETURN TRANSID → HTTP response:** CICS pseudo-conversational return
   → HTTP 200 response with JSON body.
5. **EXEC CICS XCTL → React router navigation:** `XCTL PROGRAM('COTRN00C')`
   → React Router `navigate('/transactions')`.
6. **HANDLE ABEND → @ControllerAdvice:** CICS abend handler → Spring
   `@ExceptionHandler` returning HTTP 500 with error body.

### Target Architecture

```
Browser (React)
    │  GET /api/transactions/{tranId}
    ▼
Spring Boot Controller
    │  TransactionService.getTransaction(tranId)
    ▼
JPA Repository
    │  SELECT * FROM tran_record WHERE tran_id = ?
    ▼
PostgreSQL (tran_record table)
```

React `TransactionDetail` component displays the fields from COTRN1A BMS mapset:
- Transaction ID, type, category, description
- Amount, merchant name, merchant city
- Card number (masked: first 4 + last 4), origination timestamp

### Expected Java/React Output

```java
// TransactionController.java
@RestController @RequestMapping("/api/transactions")
public class TransactionController {
    @GetMapping("/{tranId}")
    public ResponseEntity<TransactionRecord> getTransaction(
            @PathVariable String tranId,
            @AuthenticationPrincipal UserDetails user) {
        return service.findById(tranId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

```tsx
// TransactionDetail.tsx
const TransactionDetail: React.FC<{tranId: string}> = ({tranId}) => {
  const { data, loading, error } = useQuery(GET_TRANSACTION, {variables: {tranId}});
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;
  return (
    <div className="transaction-detail">
      <h2>Transaction {data.transaction.tranId}</h2>
      <dl>
        <dt>Amount</dt><dd>{formatCurrency(data.transaction.tranAmt)}</dd>
        <dt>Merchant</dt><dd>{data.transaction.tranMerchantName}</dd>
        {/* ... */}
      </dl>
    </div>
  );
};
```

### Test Harness

1. **COBOL reference output:** Using GnuCOBOL + CICS simulator (or terminal
   emulator capture), record the screen output for transaction ID `0001001234567890`
2. **Java API test:** Call `GET /api/transactions/0001001234567890` against
   Testcontainers PostgreSQL with seeded test data; assert JSON fields match
3. **React visual test:** Cypress component test renders `TransactionDetail` and
   asserts field values match expected data

### Acceptance Criteria

- [ ] API returns correct transaction fields for a valid transaction ID
- [ ] API returns HTTP 404 for a non-existent transaction ID (maps to COBOL NOTFND condition)
- [ ] React component renders all fields from BMS map CTRN1A
- [ ] React component matches COBOL screen layout (field labels, order)
- [ ] Authentication required — unauthenticated request returns HTTP 401
- [ ] Unit test coverage ≥ 90% for service layer
- [ ] Code reviewed by senior Java developer

---

## PoC Success Criteria

The PoC is complete when:

1. Both programs are translated, tested, and reviewed
2. Dual test harness (COBOL + Java) confirms output fidelity
3. Team demonstrates the full stack: COBOL source → Java service → React UI
4. Lessons learned documented for application to Wave 1 programs
5. Translation playbook updated with any patterns discovered

---

## PoC Scope Exclusions

The PoC does NOT need to:
- Implement full authentication (stub JWT for PoC)
- Handle all edge cases (focus on happy path + NOTFND)
- Be production-hardened (no rate limiting, no full observability)
- Migrate actual production data

These are addressed in the main migration phases.

---

*See `migration/assessment-report.md` Section "Proof-of-Concept Plan" for context.*
