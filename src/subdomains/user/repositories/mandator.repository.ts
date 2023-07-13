import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { Mandator } from '../entities/mandator.entity';

@Injectable()
export class MandatorRepository extends BaseRepository<Mandator> {
  constructor(manager: EntityManager) {
    super(Mandator, manager);
  }
}
