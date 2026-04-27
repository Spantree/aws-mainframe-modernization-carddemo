/**
 * Generated from COCRDSLC.cbl — CardDemo TypeScript migration
 * Original COBOL program: Credit card list / selection screen.
 * Complexity: 2.95 (Moderate).
 *   Transaction ID: CCDL. Displays a paginated list of credit cards associated
 *   with an account. The user selects a card to view details (XCTLs to COCRDUPC
 *   for update or COCRDLIC for the complex card list view). Reads CARDFILE by
 *   alternate index on account ID (CXACAIX). PF7/PF8 paginate.
 *   Business criticality: 2 — read-only card selection.
 *
 * Migration target: NestJS + TypeORM + PostgreSQL
 *
 * COBOL paragraph mapping:
 *   MAIN-PARA             → listCards()
 *   PROCESS-PF7-KEY       → previous page (page - 1)
 *   PROCESS-PF8-KEY       → next page (page + 1)
 *   PROCESS-TRAN-SELECT   → selectCard()
 *   READ-NEXT-CARD-RECORD → cardRepository.find() with skip/take
 *   SEND-CARD-LIST-SCREEN → CardListResponse
 */

import {
  Controller,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardRecord } from '../entities/CardRecord';
import { CardCrossReference } from '../entities/CardCrossReference';

export interface CardListItem {
  /** CARD-NUM — PIC X(16) */
  cardNumber: string;
  /** CARD-ACCT-ID — PIC 9(11) */
  accountId: string;
  /** CARD-EMBOSSED-NAME — PIC X(50) */
  embossedName: string;
  /** CARD-EXPIRAION-DATE — PIC X(10) */
  expirationDate: string;
  /** CARD-ACTIVE-STATUS — PIC X(01): 'Y' = active */
  activeStatus: string;
}

export interface CardListResponse {
  accountId?: string;
  pageNum: number;
  hasNextPage: boolean;
  cards: CardListItem[];
  message?: string;
}

const PAGE_SIZE = 10;

@Controller('cards')
export class CardListController {
  private readonly logger = new Logger(CardListController.name);

  constructor(
    @InjectRepository(CardRecord)
    private readonly cardRepository: Repository<CardRecord>,

    @InjectRepository(CardCrossReference)
    private readonly cardXrefRepository: Repository<CardCrossReference>,
  ) {}

  /**
   * List credit cards, optionally filtered by account ID.
   *
   * COBOL equivalent: READ-NEXT-CARD-RECORD loop via CXACAIX alternate index.
   * CICS command: EXEC CICS STARTBR FILE('CARDFILE') RIDFLG(CARD-ACCT-ID)
   *   then READNEXT / READPREV for pagination.
   *
   * When accountId is provided, we join through CARDXREF (CXACAIX equivalent).
   * Without accountId, returns all cards paginated — admin use only.
   */
  @Get()
  async listCards(
    @Query('accountId') accountId?: string,
    @Query('page') pageParam = '1',
    @Query('activeOnly') activeOnly = 'false',
  ): Promise<CardListResponse> {
    const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    let cards: CardRecord[];

    if (accountId) {
      const paddedAccountId = accountId.trim().padStart(11, '0');

      // Resolve card numbers via CARDXREF (alternate index equivalent)
      const xrefs = await this.cardXrefRepository.find({
        where: { accountId: paddedAccountId },
      });

      if (xrefs.length === 0) {
        return {
          accountId: paddedAccountId,
          pageNum: page,
          hasNextPage: false,
          cards: [],
          message: `No cards found for account ${paddedAccountId}`,
        };
      }

      const cardNumbers = xrefs.map((x) => x.cardNumber);
      const qb = this.cardRepository
        .createQueryBuilder('card')
        .where('card.cardNumber IN (:...cardNumbers)', { cardNumbers });

      if (activeOnly === 'true') {
        qb.andWhere('card.activeStatus = :status', { status: 'Y' });
      }

      cards = await qb
        .orderBy('card.cardNumber', 'ASC')
        .skip(skip)
        .take(PAGE_SIZE + 1)
        .getMany();
    } else {
      const qb = this.cardRepository.createQueryBuilder('card');
      if (activeOnly === 'true') {
        qb.where('card.activeStatus = :status', { status: 'Y' });
      }
      cards = await qb
        .orderBy('card.cardNumber', 'ASC')
        .skip(skip)
        .take(PAGE_SIZE + 1)
        .getMany();
    }

    const hasNextPage = cards.length > PAGE_SIZE;
    const pageCards = cards.slice(0, PAGE_SIZE).map((c) => ({
      cardNumber: c.cardNumber,
      accountId: c.accountId.padStart(11, '0'),
      embossedName: c.embossedName,
      expirationDate: c.expirationDate,
      activeStatus: c.activeStatus,
    }));

    this.logger.debug(
      `listCards page=${page} accountId=${accountId ?? 'all'} returned=${pageCards.length}`,
    );

    return {
      accountId: accountId ? accountId.trim().padStart(11, '0') : undefined,
      pageNum: page,
      hasNextPage,
      cards: pageCards,
    };
  }
}
