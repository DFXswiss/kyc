import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { SpiderApiRegistry } from 'src/integration/spider/services/spider-api.registry';
import { Country } from 'src/subdomains/master-data/country/country.entity';
import { CountryService } from 'src/subdomains/master-data/country/country.service';
import { Mandator } from '../entities/mandator.entity';
import { MandatorRepository } from '../repositories/mandator.repository';

@Injectable()
export class MandatorService implements OnModuleInit {
  constructor(
    private readonly repo: MandatorRepository,
    private readonly spiderRegistry: SpiderApiRegistry,
    private readonly countryService: CountryService,
  ) {}

  onModuleInit() {
    void this.initSpider();
  }

  async get(reference: string): Promise<Mandator | null> {
    return this.repo.findOneBy({ reference });
  }

  async getOrThrow(reference: string): Promise<Mandator> {
    const mandator = await this.get(reference);
    if (!mandator) throw new NotFoundException('Mandator not found');

    return mandator;
  }

  async getAll(): Promise<Mandator[]> {
    return this.repo.find();
  }

  async getAllowedCountries(reference: string): Promise<Country[]> {
    const mandator = await this.getOrThrow(reference);

    return this.countryService.getAll().then((countries) => countries.filter((c) => mandator.isCountryAllowed(c)));
  }

  // --- HELPER METHODS --- //
  private async initSpider() {
    const mandators = await this.repo.find();
    this.spiderRegistry.init(mandators);
  }
}
