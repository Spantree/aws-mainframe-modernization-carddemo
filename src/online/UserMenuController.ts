/**
 * Generated from COMEN01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COMEN01C — Main menu for regular users. Complexity: 2.00 (Moderate).
 *   Transaction ID: CM00. Entry point for non-admin users after sign-on.
 *   Shows account/card/transaction options based on user type.
 *   Menu options (from COMEN02Y copybook) include account view, card operations,
 *   transaction history, and bill payment.
 *   Notable: checks if optional programs (COPAUS0C) are installed via CICS INQUIRE.
 *   PF3 returns to sign-on screen.
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import { Controller, Get, Post, Body, Session, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

/** Menu option — from COMEN02Y (user menu options table) */
export interface UserMenuOption {
  optionNumber: number;
  optionName: string;
  programName: string;
  route: string;
  userTypeRequired: 'A' | 'U' | 'ANY'; // 'A' = admin only
  isInstalled: boolean;
}

export class UserMenuResponseDto {
  currentDate!: string;
  currentTime!: string;
  transactionId!: string;
  programName!: string;
  options!: UserMenuOption[];
  errorMessage?: string;
}

export class UserMenuSelectionDto {
  option!: number;
}

/**
 * COMEN01C — User main menu controller.
 * Transaction ID: CM00
 */
@Controller('user-menu')
export class UserMenuController {
  private readonly logger = new Logger(UserMenuController.name);

  private readonly programName = 'COMEN01C';
  private readonly transactionId = 'CM00';

  /**
   * User menu options from COMEN02Y copybook.
   * COBOL: CDEMO-MENU-OPT-COUNT, CDEMO-MENU-OPTIONS-DATA, CDEMO-MENU-OPT-USRTYPE
   *
   * Note: COPAUS0C (IMS-based payment authorization) is marked isInstalled=false
   * because it requires IMS DL/I which is not part of the core migration.
   * COBOL: EXEC CICS INQUIRE PROGRAM(CDEMO-MENU-OPT-PGMNAME) NOHANDLE
   */
  private readonly userOptions: UserMenuOption[] = [
    {
      optionNumber: 1,
      optionName: 'View Account Details         ',
      programName: 'COACTVWC',
      route: '/accounts/view',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 2,
      optionName: 'List Cards for Account       ',
      programName: 'COCRDSLC',
      route: '/cards/list',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 3,
      optionName: 'View Credit Card Detail      ',
      programName: 'COCRDUPC',
      route: '/cards/detail',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 4,
      optionName: 'List Transactions for Account',
      programName: 'COTRN00C',
      route: '/transactions/list',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 5,
      optionName: 'View Transaction Detail      ',
      programName: 'COTRN01C',
      route: '/transactions/detail',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 6,
      optionName: 'Add Transaction              ',
      programName: 'COTRN02C',
      route: '/transactions/add',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 7,
      optionName: 'Make Payment                 ',
      programName: 'COBIL00C',
      route: '/payments',
      userTypeRequired: 'ANY',
      isInstalled: true,
    },
    {
      optionNumber: 8,
      optionName: 'Generate Report              ',
      programName: 'CORPT00C',
      route: '/reports',
      userTypeRequired: 'A',
      isInstalled: true,
    },
    {
      optionNumber: 9,
      optionName: 'Payment Authorization (IMS)  ',
      programName: 'COPAUS0C',
      route: '/authorization',
      userTypeRequired: 'ANY',
      // isInstalled: false — CICS INQUIRE returned PGMIDER; IMS not in scope
      isInstalled: false,
    },
  ];

  /**
   * GET /user-menu — Display user menu.
   * COMEN01C paragraph: SEND-MENU-SCREEN
   */
  @Get()
  showMenu(@Session() session: Record<string, unknown>): UserMenuResponseDto {
    const commarea = session['commarea'] as CardDemoCommarea;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const currentDate = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear().toString().substring(2)}`;
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Filter options: admin-only options hidden for regular users
    // COBOL: IF CDEMO-USRTYP-USER AND CDEMO-MENU-OPT-USRTYPE(WS-OPTION) = 'A'
    const userType = commarea?.userType ?? 'U';
    const visibleOptions = this.userOptions.filter(
      (opt) => opt.userTypeRequired === 'ANY' || opt.userTypeRequired === userType,
    );

    return {
      currentDate,
      currentTime,
      transactionId: this.transactionId,
      programName: this.programName,
      options: visibleOptions,
    };
  }

  /**
   * POST /user-menu — Process menu selection.
   * COMEN01C paragraph: PROCESS-ENTER-KEY
   */
  @Post()
  processSelection(
    @Body() dto: UserMenuSelectionDto,
    @Session() session: Record<string, unknown>,
    @Res() res: Response,
  ): void {
    const commarea = session['commarea'] as CardDemoCommarea;

    if (!commarea) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Not authenticated' });
      return;
    }

    const option = dto.option;
    const userType = commarea.userType;

    if (!option || option < 1 || option > this.userOptions.length) {
      res.status(HttpStatus.BAD_REQUEST).json({
        errorMessage: 'Please enter a valid option number...',
      });
      return;
    }

    const selected = this.userOptions[option - 1];

    // Admin-only check — CDEMO-MENU-OPT-USRTYPE = 'A' AND CDEMO-USRTYP-USER
    if (selected.userTypeRequired === 'A' && userType !== 'A') {
      res.status(HttpStatus.FORBIDDEN).json({
        errorMessage: 'No access - Admin Only option...',
      });
      return;
    }

    // Not installed check — EXEC CICS INQUIRE PROGRAM PGMIDER
    if (!selected.isInstalled) {
      res.status(HttpStatus.OK).json({
        errorMessage: `This option is not installed...`,
      });
      return;
    }

    commarea.fromTransactionId = this.transactionId;
    commarea.fromProgram = this.programName;
    commarea.toProgram = selected.programName;
    commarea.programContext = 0;
    session['commarea'] = commarea;

    this.logger.log(`User ${commarea.userId} selected option ${option}: ${selected.programName}`);

    // EXEC CICS XCTL PROGRAM(selected) → redirect
    res.status(HttpStatus.OK).json({ redirectTo: selected.route });
  }
}
