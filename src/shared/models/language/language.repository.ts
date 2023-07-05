import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../db/base.repository';
import { Language } from './language.entity';

@Injectable()
export class LanguageRepository extends BaseRepository<Language> {
  constructor(manager: EntityManager) {
    super(Language, manager);
  }
}
