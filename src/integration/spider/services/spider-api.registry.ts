import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from 'src/shared/services/http.service';
import { SpiderApiService } from './spider-api.service';

@Injectable()
export class SpiderApiRegistry implements OnModuleInit {
  private readonly services = new Map<string, SpiderApiService>();

  constructor(private readonly http: HttpService) {}

  onModuleInit() {
    void this.init();
  }

  get(reference: string): SpiderApiService {
    return this.services.get(reference);
  }

  // --- HELPER METHODS --- //
  private async init() {
    // TODO: get from DB
    const mandators = [];

    for (const mandator of mandators) {
      const service = new SpiderApiService(this.http, mandator);
      this.services.set(mandator.reference, service);
    }
  }
}
