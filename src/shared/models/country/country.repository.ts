import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../db/base.repository';
import { Country } from './country.entity';

@Injectable()
export class CountryRepository extends BaseRepository<Country> {
  constructor(manager: EntityManager) {
    super(Country, manager);
  }
}
