/**
 * Generated from COUSR00C.cbl — CardDemo TypeScript migration
 * Original COBOL program: COUSR00C — User list (admin only), VSAM browse.
 * Complexity: 2.25 (Moderate).
 *   Transaction ID: CU00. Admin-only screen. Browses USRSEC VSAM sequentially,
 *   displays 10 users per page. Supports forward pagination via COMMAREA.
 *   On user selection XCTLs to COUSR01C (view).
 *   Business criticality: 3 — admin user management.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA               → handleRequest()
 *   PROCESS-ENTER-KEY       → listUsers()
 *   PROCESS-PF7-KEY         → previousPage()
 *   PROCESS-PF8-KEY         → nextPage()
 *   PROCESS-SELECTED-USER   → selectUser()
 *   SEND-USER-LIST          → (response serialization)
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Session,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSecurityRecord } from '../entities/UserSecurityRecord';
import { CardDemoCommarea } from '../dto/CardDemoCommarea';

export class UserListQueryDto {
  /** CDEMO-CU00-PAGE-NUM — current page number (1-based) */
  page?: number;
  /** CDEMO-CU00-USRID-FIRST — first user ID on current page (for keyset) */
  firstUserId?: string;
  /** CDEMO-CU00-USRID-LAST — last user ID on current page */
  lastUserId?: string;
}

export interface UserListItem {
  /** USER-SEL — PIC X(01) — selection indicator */
  selected: boolean;
  /** USER-ID — PIC X(08) */
  userId: string;
  /** USER-NAME — PIC X(25) */
  userName: string;
  /** USER-TYPE — PIC X(08) — 'ADMIN   ' or 'USER    ' */
  userType: string;
}

export interface UserListResponse {
  /** WS-PAGE-NUM PIC S9(04) COMP */
  pageNum: number;
  /** CDEMO-CU00-NEXT-PAGE-FLG — 'Y' if more pages exist */
  hasNextPage: boolean;
  users: UserListItem[];
  message?: string;
}

/**
 * UserListController — translates COUSR00C.
 * Transaction ID: CU00
 *
 * ACCESS CONTROL: Admin-only. Validate CDEMO-USER-TYPE = 'A' before serving.
 */
@Controller('users')
export class UserListController {
  private readonly logger = new Logger(UserListController.name);

  /** WS-PGMNAME PIC X(08) VALUE 'COUSR00C' */
  private readonly programName = 'COUSR00C';
  /** WS-TRANID PIC X(04) VALUE 'CU00' */
  private readonly transactionId = 'CU00';
  /** PAGE_SIZE — WS-USER-DATA USER-REC OCCURS 10 TIMES */
  private readonly pageSize = 10;

  constructor(
    @InjectRepository(UserSecurityRecord)
    private readonly userRepo: Repository<UserSecurityRecord>,
  ) {}

  /**
   * GET /users — list page of users.
   * Maps to PROCESS-ENTER-KEY / PROCESS-PF8-KEY (next page).
   * Admin-only guard should be applied via a NestJS guard.
   */
  @Get()
  async listUsers(
    @Query() query: UserListQueryDto,
    @Session() session: { commarea?: CardDemoCommarea },
  ): Promise<UserListResponse> {
    this.assertAdmin(session.commarea);

    const page = Math.max(1, Number(query.page ?? 1));
    const skip = (page - 1) * this.pageSize;

    // STARTBR / READNEXT equivalent: paginated query against user_security_records
    const [users, total] = await this.userRepo.findAndCount({
      order: { userId: 'ASC' },
      skip,
      take: this.pageSize + 1, // fetch one extra to detect next page
    });

    const hasNextPage = users.length > this.pageSize;
    const pageUsers = users.slice(0, this.pageSize);

    const items: UserListItem[] = pageUsers.map((u) => ({
      selected: false,
      userId: u.userId.padEnd(8),
      userName: `${u.firstName?.trim() ?? ''} ${u.lastName?.trim() ?? ''}`.trim().padEnd(25),
      userType: u.userType === 'A' ? 'ADMIN   ' : 'USER    ',
    }));

    this.logger.log(
      `${this.programName} [${this.transactionId}]: page=${page} ` +
        `returned=${items.length} total=${total}`,
    );

    return {
      pageNum: page,
      hasNextPage,
      users: items,
    };
  }

  /**
   * GET /users/previous — previous page.
   * Maps to PROCESS-PF7-KEY.
   */
  @Get('previous')
  async previousPage(
    @Query() query: UserListQueryDto,
    @Session() session: { commarea?: CardDemoCommarea },
  ): Promise<UserListResponse> {
    const prevPage = Math.max(1, Number(query.page ?? 1) - 1);
    return this.listUsers({ ...query, page: prevPage }, session);
  }

  /**
   * POST /users/select — select a user from the list.
   * Maps to PROCESS-SELECTED-USER → XCTL to COUSR01C.
   * Returns redirect target (COUSR01C → UserViewController).
   */
  @Post('select')
  @HttpCode(HttpStatus.OK)
  selectUser(
    @Body() body: { userId: string },
    @Session() session: { commarea?: CardDemoCommarea },
  ): { redirectTo: string; userId: string } {
    this.assertAdmin(session.commarea);

    this.logger.log(
      `${this.programName}: user selected: ${body.userId}`,
    );

    // XCTL TO COUSR01C with selected user ID
    return {
      redirectTo: 'user-view',
      userId: body.userId.trim(),
    };
  }

  /** Admin guard — mirrors COBOL check of CDEMO-USER-TYPE */
  private assertAdmin(commarea?: CardDemoCommarea): void {
    if (commarea?.userType !== 'A') {
      throw new ForbiddenException(
        'Access denied — admin-only transaction CU00',
      );
    }
  }
}
