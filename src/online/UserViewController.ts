/**
 * Generated from COUSR01C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COUSR01C — User view (display user record).
 * Complexity: 1.70 (Easy).
 *   Transaction ID: CU01. Displays a single user's security record.
 *   Read-only. XCTL source: COUSR00C (user list selection).
 *   Business criticality: 2 — read-only admin display.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → getUser()
 *   PROCESS-BACKPF-KEY    → (handled client-side navigation)
 *   READ-USER-SEC-FILE    → userRepo.findOneBy()
 *   SEND-USER-DETAIL      → UserDetailResponse
 */

import {
  Controller,
  Get,
  Param,
  Logger,
  NotFoundException,
  ForbiddenException,
  Session,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSecurityRecord } from '../entities/UserSecurityRecord';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

export interface UserDetailResponse {
  /** USR-ID — PIC X(08) */
  userId: string;
  /** USR-FNAME — PIC X(20) */
  firstName: string;
  /** USR-LNAME — PIC X(20) */
  lastName: string;
  /** USR-UTYPE — PIC X(01) — 'A'=Admin, 'U'=User */
  userType: string;
  /** Derived display label */
  userTypeLabel: string;
}

/**
 * UserViewController — translates COUSR01C.
 * Transaction ID: CU01
 */
@Controller('users')
export class UserViewController {
  private readonly logger = new Logger(UserViewController.name);

  /** WS-PGMNAME PIC X(08) VALUE 'COUSR01C' */
  private readonly programName = 'COUSR01C';
  /** WS-TRANID PIC X(04) VALUE 'CU01' */
  private readonly transactionId = 'CU01';

  constructor(
    @InjectRepository(UserSecurityRecord)
    private readonly userRepo: Repository<UserSecurityRecord>,
  ) {}

  /**
   * GET /users/:userId — view user detail.
   * Maps to MAIN-PARA → READ-USER-SEC-FILE → SEND-USER-DETAIL.
   * Admin guard: only admin users may view the user list.
   */
  @Get(':userId')
  async getUser(
    @Param('userId') userId: string,
    @Session() session: { commarea?: CardDemoCommarea },
  ): Promise<UserDetailResponse> {
    if (session.commarea?.userType !== 'A') {
      throw new ForbiddenException(
        'Access denied — admin-only transaction CU01',
      );
    }

    // READ-USER-SEC-FILE equivalent
    const user = await this.userRepo.findOneBy({ userId: userId.padEnd(8) });
    if (!user) {
      this.logger.warn(
        `${this.programName} [${this.transactionId}]: user not found: ${userId}`,
      );
      throw new NotFoundException(`User not found: ${userId}`);
    }

    this.logger.log(
      `${this.programName} [${this.transactionId}]: displaying user ${userId}`,
    );

    return {
      userId: user.userId.trimEnd(),
      firstName: user.firstName?.trimEnd() ?? '',
      lastName: user.lastName?.trimEnd() ?? '',
      userType: user.userType,
      userTypeLabel: user.userType === 'A' ? 'Administrator' : 'Regular User',
    };
  }
}
