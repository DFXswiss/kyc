import { Column, Entity } from 'typeorm';
import { IEntity } from '../db/entity';

@Entity()
export class Language extends IEntity {
  @Column({ unique: true, length: 10 })
  symbol: string;

  @Column()
  name: string;

  @Column()
  foreignName: string;
}
