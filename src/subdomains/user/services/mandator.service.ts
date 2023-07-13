import { Injectable, OnModuleInit } from '@nestjs/common';
import { SpiderApiRegistry } from 'src/integration/spider/services/spider-api.registry';
import { Mandator } from '../entities/mandator.entity';
import { MandatorRepository } from '../repositories/mandator.repository';

@Injectable()
export class MandatorService implements OnModuleInit {
  constructor(private readonly repo: MandatorRepository, private readonly spiderRegistry: SpiderApiRegistry) {}

  onModuleInit() {
    void this.initSpider();
  }

  async get(reference: string): Promise<Mandator> {
    return this.repo.findOneBy({ reference });
  }

  async getAll(): Promise<Mandator[]> {
    return this.repo.find();
  }

  // --- HELPER METHODS --- //
  private async initSpider() {
    const mandators = await this.repo.find();
    this.spiderRegistry.init(mandators);
  }
}
