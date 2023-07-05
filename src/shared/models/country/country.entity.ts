import { Column, Entity } from 'typeorm';
import { IEntity } from '../db/entity';

@Entity()
export class Country extends IEntity {
  @Column({ unique: true, length: 10 })
  symbol: string;

  @Column({ length: 256 })
  name: string;
}
