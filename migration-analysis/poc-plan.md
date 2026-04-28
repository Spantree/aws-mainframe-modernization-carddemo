# Proof-of-Concept Plan — CardDemo Migration

**Date:** 2026-02-28
**Purpose:** Validate the full COBOL→TypeScript→React translation pipeline before committing
to full migration scope.

---

## Overview

The PoC translates 2 programs — one batch and one CICS — to demonstrate:
1. The translation toolchain works end-to-end
2. The TypeScript output is idiomatic and maintainable (not "COBOL in TypeScript")
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
   TypeORM `CustomerRepository.find()` query.
2. **COBOL record → TypeORM entity:** Map `CUSTOMER-RECORD` (CVCUS01Y) to
   `customer.entity.ts` using the type mappings in `migration/data-model.md`.
3. **Sequential processing → BullMQ:** Wrap in a BullMQ processor that streams
   records from the repository and writes them out.
4. **CEE3ABD abend handler → NestJS exception filter:** Replace the IBM LE abend trap
   with a NestJS `@Catch()` exception filter.

### Expected TypeScript Output

```typescript
// customer.entity.ts — from CVCUS01Y
@Entity('customer')
export class Customer {
  @PrimaryColumn({ type: 'integer' })
  custId: number;

  @Column({ type: 'varchar', length: 25 })
  custFirstName: string;

  @Column({ type: 'varchar', length: 25 })
  custLastName: string;
  // ... (see data-model.md for all fields)
}

// customer-print.processor.ts — replaces CBCUS01C
@Processor('customer-print')
export class CustomerPrintProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
  ) {
    super();
  }

  async process(): Promise<void> {
    const customers = await this.repo.find();
    for (const c of customers) {
      console.log(
        `CUSTOMER: ${c.custId.toString().padStart(9, '0')}  ` +
        `${c.custFirstName.padEnd(25)} ${c.custLastName.padEnd(25)}`,
      );
    }
  }
}
```

### Test Harness

1. **GnuCOBOL reference run:** Compile CBCUS01C.cbl with GnuCOBOL, run against
   test CUSTFILE data, capture output to `cbcus01c-reference.txt`
2. **TypeScript test run:** Run the customer-print processor against the same data
   loaded into a PostgreSQL test database (Testcontainers), capture output to
   `cbcus01c-ts.txt`
3. **Diff:** `diff cbcus01c-reference.txt cbcus01c-ts.txt` must produce zero
   differences (accounting for whitespace normalization if needed)

### Acceptance Criteria

- [ ] TypeScript program produces identical output to COBOL for all 10 test customer records
- [ ] TypeScript program produces identical output for edge cases: customer with no middle name,
      customer with max-length name fields, customer with FICO score = 300 and 850
- [ ] Unit test coverage ≥ 90%
- [ ] Code reviewed by senior TypeScript developer — idiomatic (no `goto`, no global state)

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

1. **CICS COMMAREA → DTO + JWT session:** COCOM01Y COMMAREA (user context, selected
   transaction ID) → request DTO with the transaction ID + JWT claims for the user
   context, passed as HTTP headers or URL path parameter.
2. **EXEC CICS READ → TypeORM:** `EXEC CICS READ DATASET('TRANSACT') RIDFLD(tran-id)`
   → `transactionRepository.findOneBy({ tranId })` with NotFoundException handling.
3. **BMS SEND MAP → React:** COTRN01 BMS mapset → `TransactionDetail.tsx` React
   component receiving a GraphQL query result.
4. **EXEC CICS RETURN TRANSID → HTTP response:** CICS pseudo-conversational return
   → HTTP 200 response with JSON body.
5. **EXEC CICS XCTL → React router navigation:** `XCTL PROGRAM('COTRN00C')`
   → React Router `navigate('/transactions')`.
6. **HANDLE ABEND → exception filter:** CICS abend handler → NestJS
   `@Catch()` exception filter returning HTTP 500 with error body.

### Target Architecture

```
Browser (React)
    │  GET /api/transactions/{tranId}
    ▼
NestJS Controller
    │  TransactionService.getTransaction(tranId)
    ▼
TypeORM Repository
    │  SELECT * FROM tran_record WHERE tran_id = ?
    ▼
PostgreSQL (tran_record table)
```

React `TransactionDetail` component displays the fields from COTRN1A BMS mapset:
- Transaction ID, type, category, description
- Amount, merchant name, merchant city
- Card number (masked: first 4 + last 4), origination timestamp

### Expected TypeScript / React Output

```typescript
// transaction.controller.ts
@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Get(':tranId')
  async getTransaction(
    @Param('tranId') tranId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TransactionDto> {
    const tx = await this.service.findById(tranId);
    if (!tx) throw new NotFoundException();
    return tx;
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
2. **NestJS API test:** Call `GET /api/transactions/0001001234567890` against
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
- [ ] Code reviewed by senior TypeScript developer

---

## PoC Success Criteria

The PoC is complete when:

1. Both programs are translated, tested, and reviewed
2. Dual test harness (COBOL + TypeScript) confirms output fidelity
3. Team demonstrates the full stack: COBOL source → NestJS service → React UI
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
