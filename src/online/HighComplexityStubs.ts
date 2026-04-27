/**
 * High-complexity CICS program stubs — CardDemo TypeScript migration
 *
 * These programs scored above 3.5/5 on the composite complexity index
 * and require human specialist review before automated translation proceeds.
 *
 * Programs covered here:
 *   COCRDLIC (3.85) — Card list with complex search and filtering
 *   COTRTLIC (3.6)  — Transaction list with complex aggregation
 *
 * The third high-complexity program (COTRTUPC, 3.3) lives in its own file
 * (TransactionUpdateController.ts) so the class name doesn't collide with
 * the per-program stub naming convention used elsewhere.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 */
import { Controller, Get, NotImplementedException } from '@nestjs/common';

/**
 * Translates COCRDLIC.cbl
 * Complexity: 3.85/5 — 1,093 lines, 18 CICS commands, 16 GO TOs
 * Status: STUB — requires human specialist
 */
@Controller('cards/search')
export class CardSearchController {
  @Get()
  searchCards(): never {
    throw new NotImplementedException(
      'CardSearch requires human specialist migration (COCRDLIC, complexity 3.85)',
    );
  }
}

/**
 * Translates COTRTLIC.cbl
 * Complexity: 3.6/5 — 1,861 lines, 12 CICS commands, 28 GO TOs
 * Status: STUB — requires human specialist
 */
@Controller('transactions/search')
export class TransactionSearchController {
  @Get()
  searchTransactions(): never {
    throw new NotImplementedException(
      'TransactionSearch requires human specialist migration (COTRTLIC, complexity 3.6)',
    );
  }
}
