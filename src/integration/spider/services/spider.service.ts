import { Injectable } from '@nestjs/common';
import { SpiderApiRegistry } from './spider-api.registry';

@Injectable()
export class SpiderService {
  constructor(private readonly spiderRegistry: SpiderApiRegistry) {}
}
