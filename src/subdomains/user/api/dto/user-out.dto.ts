import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LanguageDto } from 'src/subdomains/master-data/language/dto/language.dto';
import { KycStepName, KycStepStatus } from '../../enums/kyc.enum';
import { KycStatus } from '../../enums/user.enum';

export class KycStepDto {
  @ApiProperty({ enum: KycStepName })
  name: KycStepName;

  @ApiProperty({ enum: KycStepStatus })
  status: KycStepStatus;

  @ApiPropertyOptional()
  sessionUrl?: string;

  @ApiPropertyOptional()
  setupUrl?: string;

  @ApiPropertyOptional()
  sessionId?: string;
}

export class UserInfoDto {
  @ApiProperty({ type: LanguageDto })
  language: LanguageDto;

  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  @ApiProperty({ type: KycStepDto, isArray: true })
  kycSteps: KycStepDto[];
}
