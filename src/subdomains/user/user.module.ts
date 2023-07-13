import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationModule } from 'src/integration/integration.module';
import { UserController } from './api/controllers/user.controller';
import { KycStep } from './entities/kyc-step.entity';
import { Mandator } from './entities/mandator.entity';
import { User } from './entities/user.entity';
import { MandatorRepository } from './repositories/mandator.repository';
import { UserRepository } from './repositories/user.repository';
import { KycSyncService } from './services/kyc-sync.service';
import { KycService } from './services/kyc.service';
import { MandatorService } from './services/mandator.service';
import { UserService } from './services/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mandator, User, KycStep]), IntegrationModule],
  controllers: [UserController],
  providers: [MandatorRepository, UserRepository, MandatorService, UserService, KycService, KycSyncService],
})
export class UserModule {}
