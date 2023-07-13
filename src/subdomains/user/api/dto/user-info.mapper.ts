import { LanguageDtoMapper } from 'src/subdomains/master-data/language/dto/language-dto.mapper';
import { User } from 'src/subdomains/user/entities/user.entity';
import { KycStepMapper } from './kyc-step.mapper';
import { UserInfoDto } from './user-out.dto';

export class UserInfoMapper {
  static toDto(user: User): UserInfoDto {
    const dto: UserInfoDto = {
      language: LanguageDtoMapper.entityToDto(user.language),
      kycStatus: user.kycStatus,
      kycSteps: KycStepMapper.entitiesToDto(user.kycSteps),
    };

    return Object.assign(new UserInfoDto(), dto);
  }
}
