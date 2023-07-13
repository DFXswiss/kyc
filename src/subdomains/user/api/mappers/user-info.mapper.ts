import { User } from 'src/subdomains/user/entities/user.entity';
import { UserInfoDto } from '../dto/user-out.dto';

export class UserInfoMapper {
  static toDto(user: User): UserInfoDto {
    const dto: UserInfoDto = {
      language: user.language,
      kycStatus: user.kycStatus,
    };

    return Object.assign(new UserInfoDto(), dto);
  }
}
