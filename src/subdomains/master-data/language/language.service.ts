import { Injectable } from '@nestjs/common';
import { LanguageRepository } from 'src/subdomains/master-data/language/language.repository';
import { Language } from './language.entity';

@Injectable()
export class LanguageService {
  constructor(private repo: LanguageRepository) {}

  async getAll(): Promise<Language[]> {
    return this.repo.find();
  }

  async get(id: number): Promise<Language> {
    return this.repo.findOneBy({ id });
  }

  async getBySymbol(symbol: string): Promise<Language> {
    return this.repo.findOneBy({ symbol });
  }
}
