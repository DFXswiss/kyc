import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationModule } from 'src/integration/integration.module';
import { KycStep } from './entities/kyc-step.entity';
import { Mandator } from './entities/mandator.entity';
import { User } from './entities/user.entity';
import { MandatorRepository } from './repositories/mandator.repository';
import { UserRepository } from './repositories/user.repository';
import { MandatorService } from './services/mandator.service';
import { UserService } from './services/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mandator, User, KycStep]), IntegrationModule],
  controllers: [],
  providers: [MandatorRepository, UserRepository, MandatorService, UserService],
})
export class UserModule {}
