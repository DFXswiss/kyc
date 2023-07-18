import { Injectable, NotFoundException } from '@nestjs/common';
import { LanguageRepository } from 'src/subdomains/master-data/language/language.repository';
import { Language } from './language.entity';

@Injectable()
export class LanguageService {
  constructor(private repo: LanguageRepository) {}

  async getAll(): Promise<Language[]> {
    return this.repo.find();
  }

  async get(id: number): Promise<Language | null> {
    return this.repo.findOneBy({ id });
  }

  async getOrThrow(id: number): Promise<Language> {
    const language = await this.get(id);
    if (!language) throw new NotFoundException('Language not found');

    return language;
  }

  async getBySymbol(symbol: string): Promise<Language | null> {
    return this.repo.findOneBy({ symbol });
  }

  async getBySymbolOrThrow(symbol: string): Promise<Language> {
    const language = await this.getBySymbol(symbol);
    if (!language) throw new NotFoundException('Language not found');

    return language;
  }
}
