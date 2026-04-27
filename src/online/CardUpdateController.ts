/**
 * Generated from COCRDUPC.cbl — CardDemo TypeScript migration
 * Original COBOL program: Card update — edit card record fields via CICS
 * transaction. Handles card status updates, name embossing changes,
 * and account association edits.
 * Migration target: NestJS + TypeORM + PostgreSQL
 * Complexity: 3.35/5 — medium-high, manual review recommended
 */
import { Controller, Put, Param, Body, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardRecord } from '../entities/CardRecord';

export class UpdateCardDto {
  cardEmbossedName?: string;
  cardActiveStatus?: string;
  cardExpirationDate?: string;
}

@Controller('cards')
@Injectable()
export class CardUpdateController {
  constructor(
    @InjectRepository(CardRecord)
    private readonly cardRepository: Repository<CardRecord>,
  ) {}

  @Put(':cardNumber')
  async updateCard(
    @Param('cardNumber') cardNumber: string,
    @Body() updateData: UpdateCardDto,
  ): Promise<CardRecord> {
    const card = await this.cardRepository.findOneOrFail({
      where: { cardNum: cardNumber },
    });
    if (updateData.cardEmbossedName !== undefined) {
      card.cardEmbossedName = updateData.cardEmbossedName;
    }
    if (updateData.cardActiveStatus !== undefined) {
      card.cardActiveStatus = updateData.cardActiveStatus;
    }
    if (updateData.cardExpirationDate !== undefined) {
      card.cardExpirationDate = updateData.cardExpirationDate;
    }
    return this.cardRepository.save(card);
  }
}
