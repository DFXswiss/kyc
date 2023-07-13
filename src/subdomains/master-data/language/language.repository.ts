import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { Language } from './language.entity';

@Injectable()
export class LanguageRepository extends BaseRepository<Language> {
  constructor(manager: EntityManager) {
    super(Language, manager);
  }
}
