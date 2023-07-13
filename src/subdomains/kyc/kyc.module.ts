import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { KycController } from './api/controllers/kyc.controller';
import { KycSyncService } from './services/kyc-sync.service';
import { KycService } from './services/kyc.service';

@Module({
  imports: [UserModule],
  controllers: [KycController],
  providers: [KycService, KycSyncService],
})
export class KycModule {}
