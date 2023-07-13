import { IEntity } from 'src/shared/db/entity';
import { Country } from 'src/subdomains/master-data/country/country.entity';
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

  isCountryAllowed(country: Country): boolean {
    return this.allowedCountryIds.includes(country.id);
  }
}
