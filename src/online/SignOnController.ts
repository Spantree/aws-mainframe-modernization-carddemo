/**
 * Generated from COSGN00C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COSGN00C — CICS sign-on program. Complexity: 2.10 (Moderate).
 *   Transaction ID: CS00. First program a user hits. Displays a login form,
 *   validates credentials against USRSEC VSAM, then XCTLs to either COADM01C
 *   (admin users) or COMEN01C (regular users).
 *   Business criticality: 4 — application-level authentication boundary.
 *
 * SECURITY NOTE: COBOL stored and compared passwords as plaintext PIC X(08) in VSAM.
 * This migration uses bcrypt for password comparison. See UserSecurityRecord.passwordHash.
 * The NestJS migration should integrate Spring Security or Passport.js + JWT.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Session,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserSecurityRecord } from '../entities/UserSecurityRecord';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

export class SignOnDto {
  /** PIC X(08) — USRIDINP from BMS screen COSGN0A */
  userId!: string;

  /** PIC X(08) — PASSWDINP — plaintext from screen, compared against bcrypt hash */
  password!: string;
}

export class SignOnResponseDto {
  userId!: string;
  userType!: 'A' | 'U';
  redirectTo!: 'admin-menu' | 'user-menu' | 'signon';
  errorMessage?: string;
}

/**
 * COSGN00C — Sign-on controller.
 * Maps to Transaction ID: CS00
 */
@Controller('signon')
export class SignOnController {
  private readonly logger = new Logger(SignOnController.name);

  // WS-PGMNAME PIC X(08) VALUE 'COSGN00C'
  private readonly programName = 'COSGN00C';
  // WS-TRANID  PIC X(04) VALUE 'CS00'
  private readonly transactionId = 'CS00';

  constructor(
    @InjectRepository(UserSecurityRecord)
    private readonly userRepository: Repository<UserSecurityRecord>,
  ) {}

  /**
   * GET /signon — Display sign-on screen.
   * Equivalent to: EXEC CICS SEND MAP('COSGN0A') MAPSET('COSGN00') ERASE END-EXEC
   * (SEND-SIGNON-SCREEN paragraph)
   */
  @Get()
  showSignOn(): SignOnResponseDto {
    // COBOL: SET CDEMO-PGM-ENTER TO TRUE (context = 0)
    return { userId: '', userType: 'U', redirectTo: 'signon' };
  }

  /**
   * POST /signon — Process credentials.
   * Equivalent to PROCESS-ENTER-KEY paragraph:
   *   MOVE USRIDINP TO WS-USER-ID
   *   MOVE PASSWDINP TO WS-USER-PWD
   *   PERFORM READ-USER-SEC-FILE
   *   IF user found AND password matches
   *     SET commarea user info
   *     EXEC CICS XCTL PROGRAM('COADM01C' or 'COMEN01C') END-EXEC
   */
  @Post()
  async processSignOn(
    @Body() dto: SignOnDto,
    @Session() session: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const userId = dto.userId?.trim().toUpperCase();

    if (!userId || !dto.password) {
      res.status(HttpStatus.BAD_REQUEST).json({
        redirectTo: 'signon',
        errorMessage: 'Please enter User Id and Password.',
      } as SignOnResponseDto);
      return;
    }

    // READ-USER-SEC-FILE: EXEC CICS READ DATASET('USRSEC') INTO(SEC-USER-DATA) RIDFLD(WS-USER-ID)
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`Sign-on attempt for unknown user: ${userId}`);
      res.status(HttpStatus.UNAUTHORIZED).json({
        redirectTo: 'signon',
        errorMessage: 'Invalid user ID or password.',
      } as SignOnResponseDto);
      return;
    }

    // Password validation — COBOL: IF SEC-USR-PWD = WS-USER-PWD
    // Migration: bcrypt.compare(plaintext, hash)
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      this.logger.warn(`Failed sign-on for user: ${userId}`);
      res.status(HttpStatus.UNAUTHORIZED).json({
        redirectTo: 'signon',
        errorMessage: 'Invalid user ID or password.',
      } as SignOnResponseDto);
      return;
    }

    // Build COMMAREA — equivalent to MOVE SEC-USR-ID TO CDEMO-USER-ID, etc.
    const commarea = new CardDemoCommarea();
    commarea.userId = user.userId;
    commarea.userType = user.userType as 'A' | 'U';
    commarea.fromProgram = this.programName;
    commarea.fromTransactionId = this.transactionId;
    commarea.programContext = 0;

    // Store commarea in session (replaces CICS COMMAREA passed via XCTL)
    session['commarea'] = commarea;

    // EXEC CICS XCTL:
    // Admin → COADM01C, User → COMEN01C
    const redirectTo = user.userType === 'A' ? 'admin-menu' : 'user-menu';

    this.logger.log(`User ${userId} (type ${user.userType}) signed on → ${redirectTo}`);

    res.status(HttpStatus.OK).json({
      userId: user.userId,
      userType: user.userType as 'A' | 'U',
      redirectTo,
    } as SignOnResponseDto);
  }
}
