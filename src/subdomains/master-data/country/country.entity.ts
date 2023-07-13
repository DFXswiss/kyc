import { IEntity } from 'src/shared/db/entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class Country extends IEntity {
  @Column({ unique: true, length: 10 })
  symbol: string;

  @Column()
  name: string;
}
