/**
 * Generated from COADM01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COADM01C — Admin menu CICS program. Complexity: 2.00 (Moderate).
 *   Transaction ID: CA00. Entry point for admin users after sign-on.
 *   Displays a numbered menu of admin options (user management, transaction type admin).
 *   Admin options (from COADM02Y copybook):
 *     1. User List (COUSR00C)
 *     2. User Add (COUSR01C)
 *     3. User Update (COUSR02C)
 *     4. User Delete (COUSR03C)
 *     5. Transaction Type List/Update - DB2 (COTRTLIC)
 *     6. Transaction Type Maintenance - DB2 (COTRTUPC)
 *   Non-admin users are redirected back to sign-on.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Controller, Get, Post, Body, Session, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CardDemoCommarea, isAdminUser } from '../dto/CardDemoCommarea';

/** Admin menu option — from COADM02Y CDEMO-ADMIN-OPTIONS table */
export interface AdminMenuOption {
  optionNumber: number;   // CDEMO-ADMIN-OPT-NUM PIC 9(02)
  optionName: string;     // CDEMO-ADMIN-OPT-NAME PIC X(35)
  programName: string;    // CDEMO-ADMIN-OPT-PGMNAME PIC X(08)
  route: string;          // NestJS route equivalent
}

export class AdminMenuResponseDto {
  currentDate: string;    // WS-CURDATE-MM-DD-YY
  currentTime: string;    // WS-CURTIME-HH-MM-SS
  transactionId: string;  // WS-TRANID = 'CA00'
  programName: string;    // WS-PGMNAME = 'COADM01C'
  options: AdminMenuOption[];
  errorMessage?: string;
}

export class AdminMenuSelectionDto {
  option: number;         // WS-OPTION PIC 9(02)
}

/**
 * COADM01C — Admin Menu controller.
 * Transaction ID: CA00
 */
@Controller('admin-menu')
export class AdminMenuController {
  private readonly logger = new Logger(AdminMenuController.name);

  private readonly programName = 'COADM01C';
  private readonly transactionId = 'CA00';

  /**
   * Admin menu options table — from COADM02Y copybook.
   * In COBOL this was a REDEFINES-based table:
   *   CDEMO-ADMIN-OPT-COUNT PIC 9(02) VALUE 6
   *   CDEMO-ADMIN-OPTIONS-DATA FILLER entries × 6
   *   CDEMO-ADMIN-OPTIONS REDEFINES CDEMO-ADMIN-OPTIONS-DATA
   *     CDEMO-ADMIN-OPT OCCURS 9 TIMES
   */
  private readonly adminOptions: AdminMenuOption[] = [
    { optionNumber: 1, optionName: 'User List (Security)              ', programName: 'COUSR00C', route: '/users' },
    { optionNumber: 2, optionName: 'User Add (Security)               ', programName: 'COUSR01C', route: '/users/add' },
    { optionNumber: 3, optionName: 'User Update (Security)            ', programName: 'COUSR02C', route: '/users/update' },
    { optionNumber: 4, optionName: 'User Delete (Security)            ', programName: 'COUSR03C', route: '/users/delete' },
    { optionNumber: 5, optionName: 'Transaction Type List/Update (Db2)', programName: 'COTRTLIC', route: '/transaction-types' },
    { optionNumber: 6, optionName: 'Transaction Type Maintenance (Db2)', programName: 'COTRTUPC', route: '/transaction-types/edit' },
  ];

  /**
   * GET /admin-menu — Display admin menu.
   * Equivalent to SEND-MENU-SCREEN paragraph:
   *   PERFORM POPULATE-HEADER-INFO
   *   PERFORM BUILD-MENU-OPTIONS
   *   EXEC CICS SEND MAP('COADM1A') MAPSET('COADM01') FROM(COADM1AO) ERASE
   */
  @Get()
  showMenu(@Session() session: Record<string, unknown>): AdminMenuResponseDto {
    const commarea = session['commarea'] as CardDemoCommarea;

    if (!commarea || !isAdminUser(commarea)) {
      // Return to sign-on — EXEC CICS XCTL PROGRAM('COSGN00C')
      return {
        currentDate: '',
        currentTime: '',
        transactionId: this.transactionId,
        programName: this.programName,
        options: [],
        errorMessage: 'Access denied — admin only',
      };
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    // POPULATE-HEADER-INFO paragraph:
    // MOVE FUNCTION CURRENT-DATE TO WS-CURDATE-DATA
    const currentDate = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear().toString().substring(2)}`;
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // BUILD-MENU-OPTIONS: PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > CDEMO-ADMIN-OPT-COUNT
    return {
      currentDate,
      currentTime,
      transactionId: this.transactionId,
      programName: this.programName,
      options: this.adminOptions,
    };
  }

  /**
   * POST /admin-menu — Process user option selection.
   * Equivalent to PROCESS-ENTER-KEY paragraph:
   *   MOVE OPTIONI TO WS-OPTION
   *   IF WS-OPTION > CDEMO-ADMIN-OPT-COUNT OR NOT NUMERIC → error
   *   ELSE EXEC CICS XCTL PROGRAM(CDEMO-ADMIN-OPT-PGMNAME(WS-OPTION))
   */
  @Post()
  processSelection(
    @Body() dto: AdminMenuSelectionDto,
    @Session() session: Record<string, unknown>,
    @Res() res: Response,
  ): void {
    const commarea = session['commarea'] as CardDemoCommarea;

    if (!commarea || !isAdminUser(commarea)) {
      res.status(HttpStatus.FORBIDDEN).json({ error: 'Access denied' });
      return;
    }

    const option = dto.option;

    // IF WS-OPTION IS NOT NUMERIC OR WS-OPTION > CDEMO-ADMIN-OPT-COUNT OR WS-OPTION = ZEROS
    if (!option || option < 1 || option > this.adminOptions.length) {
      res.status(HttpStatus.BAD_REQUEST).json({
        errorMessage: 'Please enter a valid option number...',
      });
      return;
    }

    const selected = this.adminOptions[option - 1];

    // Update commarea — MOVE WS-TRANID TO CDEMO-FROM-TRANID, etc.
    commarea.fromTransactionId = this.transactionId;
    commarea.fromProgram = this.programName;
    commarea.toProgram = selected.programName;
    commarea.programContext = 0;
    session['commarea'] = commarea;

    this.logger.log(`Admin ${commarea.userId} selected option ${option}: ${selected.programName}`);

    // EXEC CICS XCTL → redirect to the selected program's route
    res.status(HttpStatus.OK).json({ redirectTo: selected.route });
  }
}
