import { User } from 'src/subdomains/user/entities/user.entity';
import { KycInfoDto } from '../dto/kyc-out.dto';

export class KycInfoMapper {
  static toDto(user: User): KycInfoDto {
    const dto: KycInfoDto = {
      kycStatus: user.kycStatus,
    };

    return Object.assign(new KycInfoDto(), dto);
  }
}
