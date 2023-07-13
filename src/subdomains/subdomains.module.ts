import { Module } from '@nestjs/common';
import { KycModule } from './kyc/kyc.module';
import { MasterDataModule } from './master-data/master-data.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [UserModule, KycModule, MasterDataModule],
  controllers: [],
  providers: [],
  exports: [UserModule, KycModule, MasterDataModule],
})
export class SubdomainsModule {}
