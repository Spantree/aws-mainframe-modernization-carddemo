/**
 * Generated from COTRTLIC.cbl — CardDemo TypeScript migration
 * Original COBOL program: Transaction type list (Db2) — admin screen for
 * browsing and maintaining transaction type codes in the Db2 TRANTYPF table.
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * ⚠️ MIGRATION STATUS: STUB — requires human specialist
 *
 * This program scored 3.6/5 on the composite complexity index:
 * - Db2 CURSOR-based browse (FETCH NEXT / FETCH PRIOR) with no VSAM equivalent
 * - Embedded SQL with host variables and SQLCODE checks
 * - Selection field linked to COTRTUPC (transaction type update) via XCTL
 * - Admin-only authorization gate (CDEMO-USRTYP-ADMIN)
 * - PF7/PF8 scroll requires maintaining DB2 cursor state across screen cycles
 *
 * Automated translation is not recommended. This program requires:
 * 1. Design of stateless pagination strategy to replace Db2 cursor scroll
 * 2. TypeORM entity for TRANTYPF (transaction type master table)
 * 3. Role-based access control for admin-only routes
 * 4. Integration with TransactionUpdateController (COTRTUPC)
 */
import { Controller, Get, Query, NotImplementedException } from '@nestjs/common';

@Controller('transaction-types')
export class TransactionListComplexController {
  @Get()
  listTransactionTypes(
    @Query('page') page: string,
  ): never {
    throw new NotImplementedException(
      'TransactionListComplex (COTRTLIC) requires human specialist migration — see file header for details',
    );
  }
}
