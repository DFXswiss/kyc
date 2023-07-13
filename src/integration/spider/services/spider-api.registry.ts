import { Injectable } from '@nestjs/common';
import { HttpService } from 'src/shared/services/http.service';
import { Mandator } from 'src/subdomains/user/entities/mandator.entity';
import { SpiderApiService } from './spider-api.service';

@Injectable()
export class SpiderApiRegistry {
  private readonly services = new Map<string, SpiderApiService>();

  constructor(private readonly http: HttpService) {}

  init(mandators: Mandator[]) {
    for (const mandator of mandators) {
      const service = new SpiderApiService(this.http, mandator);
      this.services.set(mandator.reference, service);
    }
  }

  get(reference: string): SpiderApiService {
    return this.services.get(reference);
  }
}
