/**
 * Generated from COCOM01Y.cpy — CardDemo TypeScript migration
 * Original COBOL program: CARDDEMO-COMMAREA — Communication area passed between all CICS programs.
 *   In CICS, COMMAREA is the shared memory region passed between programs via XCTL/LINK.
 *   Every CardDemo CICS program copies COCOM01Y and reads/writes CARDDEMO-COMMAREA.
 *   It carries session state: who the user is, where they came from, where they're going,
 *   and the current context (customer, account, card).
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * In a NestJS migration, COMMAREA becomes a session object (stored in JWT claims or
 * server-side session). The navigation model (XCTL) becomes REST redirects or
 * frontend routing.
 */

export class CardDemoCommarea {
  // CDEMO-GENERAL-INFO

  /** PIC X(04) — Transaction ID the user came from (e.g. 'CA00', 'CM00') */
  fromTransactionId: string = '';

  /** PIC X(08) — Program name the user came from (e.g. 'COSGN00C') */
  fromProgram: string = '';

  /** PIC X(04) — Transaction ID to transfer to next (XCTL target) */
  toTransactionId: string = '';

  /** PIC X(08) — Program name to transfer to next */
  toProgram: string = '';

  /** PIC X(08) — Authenticated user ID */
  userId: string = '';

  /**
   * PIC X(01) — User type: 'A' = admin, 'U' = regular user.
   * 88 CDEMO-USRTYP-ADMIN VALUE 'A'
   * 88 CDEMO-USRTYP-USER  VALUE 'U'
   */
  userType: 'A' | 'U' = 'U';

  /**
   * PIC 9(01) — Program context: 0 = first entry, 1 = re-entry (already displayed screen).
   * 88 CDEMO-PGM-ENTER   VALUE 0
   * 88 CDEMO-PGM-REENTER VALUE 1
   */
  programContext: 0 | 1 = 0;

  // CDEMO-CUSTOMER-INFO

  /** PIC 9(09) — Customer ID in context */
  customerId: number = 0;

  /** PIC X(25) — Customer first name (cached for display) */
  customerFirstName: string = '';

  /** PIC X(25) — Customer middle name */
  customerMiddleName: string = '';

  /** PIC X(25) — Customer last name */
  customerLastName: string = '';

  // CDEMO-ACCOUNT-INFO

  /** PIC 9(11) — Account ID in context */
  accountId: number = 0;

  /** PIC X(01) — Account status ('Y'/'N') */
  accountStatus: string = '';

  // CDEMO-CARD-INFO

  /** PIC 9(16) — Card number in context */
  cardNumber: number = 0;

  // CDEMO-MORE-INFO

  /** PIC X(07) — Last BMS map name used (for back-navigation) */
  lastMap: string = '';

  /** PIC X(07) — Last BMS mapset name */
  lastMapset: string = '';
}

/** Helper: check if user has admin privileges */
export function isAdminUser(commarea: CardDemoCommarea): boolean {
  return commarea.userType === 'A';
}

/** Helper: set program context to re-entry (after first display) */
export function setReentry(commarea: CardDemoCommarea): void {
  commarea.programContext = 1;
}

/** Helper: check if this is the first entry into the program */
export function isFirstEntry(commarea: CardDemoCommarea): boolean {
  return commarea.programContext === 0;
}
