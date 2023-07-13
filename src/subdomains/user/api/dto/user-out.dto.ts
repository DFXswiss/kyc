import { ApiProperty } from '@nestjs/swagger';
import { LanguageDto } from 'src/subdomains/master-data/language/dto/language.dto';
import { KycStatus } from 'src/subdomains/user/entities/user.entity';

export class UserInfoDto {
  @ApiProperty({ type: LanguageDto })
  language: LanguageDto;

  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  // TODO
}
