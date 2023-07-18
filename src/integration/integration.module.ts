import { Module } from '@nestjs/common';
import { SpiderModule } from './spider/spider.module';

@Module({
  imports: [SpiderModule],
  controllers: [],
  providers: [],
  exports: [SpiderModule],
})
export class IntegrationModule {}
