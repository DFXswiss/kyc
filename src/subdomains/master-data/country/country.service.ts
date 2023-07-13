import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryRepository } from 'src/subdomains/master-data/country/country.repository';
import { Country } from './country.entity';

@Injectable()
export class CountryService {
  constructor(private repo: CountryRepository) {}

  async getAll(): Promise<Country[]> {
    return this.repo.find();
  }

  async get(id: number): Promise<Country> {
    return this.repo.findOneBy({ id });
  }

  async getOrThrow(id: number): Promise<Country> {
    const country = await this.get(id);
    if (!country) throw new NotFoundException('Country not found');

    return country;
  }

  async getBySymbol(symbol: string): Promise<Country> {
    return this.repo.findOneBy({ symbol });
  }
}
