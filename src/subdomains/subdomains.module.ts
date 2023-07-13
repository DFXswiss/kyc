import { Module } from '@nestjs/common';
import { MasterDataModule } from './master-data/master-data.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [UserModule, MasterDataModule],
  controllers: [],
  providers: [],
  exports: [UserModule, MasterDataModule],
})
export class SubdomainsModule {}
