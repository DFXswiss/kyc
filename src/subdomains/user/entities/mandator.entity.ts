import { IEntity } from 'src/shared/db/entity';
import { Column, Generated } from 'typeorm';

export class Mandator extends IEntity {
  @Column({ unique: true })
  @Generated('uuid')
  reference: string;

  @Column()
  name: string;

  @Column()
  mandator: string;

  @Column()
  user: string;

  @Column()
  password: string;

  @Column()
  allowedCountries: string;

  get allowedCountryIds(): number[] {
    return this.allowedCountries.split(',').map((id) => +id);
  }
}
