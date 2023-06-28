import { Module } from '@nestjs/common';
import { SpiderModule } from './spider/spider.module';

@Module({
  imports: [SpiderModule],
  exports: [SpiderModule],
  controllers: [],
  providers: [],
})
export class IntegrationModule {}
