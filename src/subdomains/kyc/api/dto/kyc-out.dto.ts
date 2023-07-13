import { ApiProperty } from '@nestjs/swagger';
import { KycStatus } from 'src/subdomains/user/entities/user.entity';

export class KycInfoDto {
  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  // TODO
}
