/**
 * Generated from COUSR03C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COUSR03C — User delete (remove security record).
 * Complexity: 1.75 (Easy).
 *   Transaction ID: CU03. Admin-only. Deletes a USRSEC record by user ID.
 *   Displays confirmation screen before delete.
 *   Business criticality: 3 — security record deletion.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA              → confirmDelete() / deleteUser()
 *   READ-USER-SEC-FILE     → userRepo.findOneBy()
 *   DELETE-USER-SEC-FILE   → userRepo.delete()
 *   SEND-USER-DELETE-SCREEN → UserDeleteResponse
 */

import {
  Controller,
  Delete,
  Get,
  Param,
  Session,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSecurityRecord } from '../entities/UserSecurityRecord';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

export interface UserDeleteConfirmResponse {
  userId: string;
  firstName: string;
  lastName: string;
  userType: string;
  /** Confirmation prompt text — mirrors COBOL screen message */
  confirmPrompt: string;
}

export interface UserDeleteResponse {
  success: boolean;
  userId: string;
  message: string;
}

/**
 * UserDeleteController — translates COUSR03C.
 * Transaction ID: CU03
 *
 * Two-step flow (mirrors COBOL pseudo-conversational pattern):
 *   Step 1: GET /users/:userId/confirm  — fetch user for display
 *   Step 2: DELETE /users/:userId       — confirm and delete
 */
@Controller('users')
export class UserDeleteController {
  private readonly logger = new Logger(UserDeleteController.name);

  private readonly programName = 'COUSR03C';
  private readonly transactionId = 'CU03';

  constructor(
    @InjectRepository(UserSecurityRecord)
    private readonly userRepo: Repository<UserSecurityRecord>,
  ) {}

  /**
   * GET /users/:userId/confirm — load user for delete confirmation screen.
   * Maps to MAIN-PARA first pass → READ-USER-SEC-FILE → SEND-USER-DELETE-SCREEN.
   */
  @Get(':userId/confirm')
  async confirmDelete(
    @Param('userId') userId: string,
    @Session() session: { commarea?: CardDemoCommarea },
  ): Promise<UserDeleteConfirmResponse> {
    this.assertAdmin(session.commarea);

    const user = await this.findUser(userId);

    return {
      userId: user.userId.trimEnd(),
      firstName: user.firstName?.trimEnd() ?? '',
      lastName: user.lastName?.trimEnd() ?? '',
      userType: user.userType,
      confirmPrompt: `Confirm delete user ${user.userId.trimEnd()}? Press DELETE to confirm.`,
    };
  }

  /**
   * DELETE /users/:userId — delete user after confirmation.
   * Maps to MAIN-PARA second pass → DELETE-USER-SEC-FILE.
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('userId') userId: string,
    @Session() session: { commarea?: CardDemoCommarea },
  ): Promise<UserDeleteResponse> {
    this.assertAdmin(session.commarea);

    // READ-USER-SEC-FILE to verify existence
    await this.findUser(userId);

    // DELETE-USER-SEC-FILE — EXEC CICS DELETE FILE('USRSEC') RIDFLD(user-id)
    await this.userRepo.delete({ userId: userId.padEnd(8).substring(0, 8) });

    this.logger.log(
      `${this.programName} [${this.transactionId}]: deleted user ${userId}`,
    );

    return {
      success: true,
      userId: userId.trim(),
      message: `User ${userId.trim()} deleted successfully`,
    };
  }

  private async findUser(userId: string): Promise<UserSecurityRecord> {
    const user = await this.userRepo.findOneBy({
      userId: userId.padEnd(8).substring(0, 8),
    });
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }
    return user;
  }

  private assertAdmin(commarea?: CardDemoCommarea): void {
    if (commarea?.userType !== 'A') {
      throw new ForbiddenException('Admin only — transaction CU03');
    }
  }
}
