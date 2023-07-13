import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { SpiderApiRegistry } from './services/spider-api.registry';

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [SpiderApiRegistry],
  exports: [SpiderApiRegistry],
})
export class SpiderModule {}
