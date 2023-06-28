import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { SpiderApiRegistry } from './services/spider-api.registry';
import { SpiderApiService } from './services/spider-api.service';

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [SpiderApiRegistry, SpiderApiService],
})
export class SpiderModule {}
