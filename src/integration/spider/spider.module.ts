import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { MasterDataModule } from 'src/subdomains/master-data/master-data.module';
import { SpiderApiRegistry } from './services/spider-api.registry';
import { SpiderService } from './services/spider.service';

@Module({
  imports: [SharedModule, MasterDataModule],
  controllers: [],
  providers: [SpiderApiRegistry, SpiderService],
  exports: [SpiderApiRegistry, SpiderService],
})
export class SpiderModule {}
