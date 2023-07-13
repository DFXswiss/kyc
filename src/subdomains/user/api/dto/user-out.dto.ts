import { ApiProperty } from '@nestjs/swagger';
import { LanguageDto } from 'src/subdomains/master-data/language/dto/language.dto';
import { KycStatus } from 'src/subdomains/user/entities/user.entity';
import { KycStepName, KycStepStatus } from '../../entities/kyc-step.entity';

export class KycStepDto {
  @ApiProperty({ type: KycStepName })
  name: KycStepName;

  @ApiProperty({ type: KycStepStatus })
  status: KycStepStatus;

  @ApiProperty()
  sessionUrl: string;
}

export class UserInfoDto {
  @ApiProperty({ type: LanguageDto })
  language: LanguageDto;

  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  @ApiProperty({ type: KycStepDto, isArray: true })
  kycSteps: KycStepDto[];
}
