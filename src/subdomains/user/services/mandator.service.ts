import { Injectable, OnModuleInit } from '@nestjs/common';
import { SpiderApiRegistry } from 'src/integration/spider/services/spider-api.registry';
import { MandatorRepository } from '../repositories/mandator.repository';

@Injectable()
export class MandatorService implements OnModuleInit {
  constructor(private readonly repo: MandatorRepository, private readonly spiderRegistry: SpiderApiRegistry) {}

  onModuleInit() {
    void this.initSpider();
  }

  // --- HELPER METHODS --- //
  private async initSpider() {
    const mandators = await this.repo.find();
    this.spiderRegistry.init(mandators);
  }
}
