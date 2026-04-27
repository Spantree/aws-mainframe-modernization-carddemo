/**
 * Generated from COUSR02C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COUSR02C — User add (create security record).
 * Complexity: 1.90 (Easy).
 *   Transaction ID: CU02. Admin-only. Creates a new USRSEC record.
 *   Validates: user ID must not already exist, first/last name required,
 *   user type must be 'A' or 'U', password required.
 *   Business criticality: 3 — security record creation.
 *
 * SECURITY NOTE: COBOL stored passwords as plaintext PIC X(08).
 * This migration hashes passwords with bcrypt before persistence.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → createUser()
 *   VALIDATE-USER-DATA    → validateUserData()
 *   WRITE-USER-SEC-FILE   → userRepo.save()
 *   SEND-USER-ADD-SCREEN  → UserCreateResponse
 */

import {
  Controller,
  Post,
  Body,
  Session,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserSecurityRecord } from '../entities/UserSecurityRecord';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

export class CreateUserDto {
  /** USR-ID — PIC X(08) — must be unique in USRSEC */
  userId: string;
  /** USR-FNAME — PIC X(20) */
  firstName: string;
  /** USR-LNAME — PIC X(20) */
  lastName: string;
  /**
   * USR-UTYPE — PIC X(01)
   * 'A' = Administrator, 'U' = Regular User
   */
  userType: 'A' | 'U';
  /**
   * USR-PWD — PIC X(08) in COBOL (plaintext)
   * Migrated: bcrypt-hashed before storage.
   */
  password: string;
}

export interface UserCreateResponse {
  success: boolean;
  userId: string;
  message: string;
}

/**
 * UserAddController — translates COUSR02C.
 * Transaction ID: CU02
 *
 * ACCESS CONTROL: Admin-only.
 */
@Controller('users')
export class UserAddController {
  private readonly logger = new Logger(UserAddController.name);

  private readonly programName = 'COUSR02C';
  private readonly transactionId = 'CU02';
  private readonly BCRYPT_ROUNDS = 10;

  constructor(
    @InjectRepository(UserSecurityRecord)
    private readonly userRepo: Repository<UserSecurityRecord>,
  ) {}

  /**
   * POST /users — create new user.
   * Maps to MAIN-PARA → VALIDATE-USER-DATA → WRITE-USER-SEC-FILE.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() dto: CreateUserDto,
    @Session() session: { commarea?: CardDemoCommarea },
  ): Promise<UserCreateResponse> {
    if (session.commarea?.userType !== 'A') {
      throw new ForbiddenException('Admin only — transaction CU02');
    }

    // VALIDATE-USER-DATA
    this.validateUserData(dto);

    // Check for duplicate — EXEC CICS READ → NOTFND expected
    const existing = await this.userRepo.findOneBy({
      userId: dto.userId.padEnd(8),
    });
    if (existing) {
      throw new ConflictException(
        `User ID already exists: ${dto.userId.trim()}`,
      );
    }

    // WRITE-USER-SEC-FILE
    // COBOL stored plaintext; we hash with bcrypt.
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const newUser = this.userRepo.create({
      userId: dto.userId.padEnd(8).substring(0, 8),
      firstName: dto.firstName.padEnd(20).substring(0, 20),
      lastName: dto.lastName.padEnd(20).substring(0, 20),
      userType: dto.userType,
      passwordHash,
    });

    await this.userRepo.save(newUser);

    this.logger.log(
      `${this.programName} [${this.transactionId}]: created user ${dto.userId}`,
    );

    return {
      success: true,
      userId: dto.userId.trim(),
      message: `User ${dto.userId.trim()} created successfully`,
    };
  }

  /**
   * VALIDATE-USER-DATA — mirrors COBOL field validation.
   */
  private validateUserData(dto: CreateUserDto): void {
    if (!dto.userId?.trim()) {
      throw new BadRequestException('User ID is required');
    }
    if (dto.userId.trim().length > 8) {
      throw new BadRequestException('User ID max length is 8 characters');
    }
    if (!dto.firstName?.trim()) {
      throw new BadRequestException('First name is required');
    }
    if (!dto.lastName?.trim()) {
      throw new BadRequestException('Last name is required');
    }
    if (!['A', 'U'].includes(dto.userType)) {
      throw new BadRequestException('User type must be A (admin) or U (user)');
    }
    if (!dto.password?.trim()) {
      throw new BadRequestException('Password is required');
    }
    if (dto.password.length > 8) {
      // COBOL PIC X(08) — 8-char limit enforced at UI layer
      throw new BadRequestException('Password max length is 8 characters');
    }
  }
}
