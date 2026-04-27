/**
 * Generated from COCRDUPC.cbl — CardDemo TypeScript migration
 * Original COBOL program: Card update — edit card record fields via CICS
 * transaction. Handles card status updates, name embossing changes,
 * and account association edits.
 * Migration target: NestJS + TypeORM + PostgreSQL
 * Complexity: 3.35/5 — medium-high, manual review recommended
 */
import { Controller, Put, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardRecord } from '../entities/CardRecord';

export class UpdateCardDto {
  embossedName?: string;
  activeStatus?: string;
  expirationDate?: string;
}

@Controller('cards')
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
      where: { cardNumber },
    });
    if (updateData.embossedName !== undefined) {
      card.embossedName = updateData.embossedName;
    }
    if (updateData.activeStatus !== undefined) {
      card.activeStatus = updateData.activeStatus;
    }
    if (updateData.expirationDate !== undefined) {
      card.expirationDate = updateData.expirationDate;
    }
    return this.cardRepository.save(card);
  }
}
