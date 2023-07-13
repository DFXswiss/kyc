import { UserService } from 'src/subdomains/user/services/user.service';
import { KycDataDto } from '../api/dto/user-in.dto';
import { UserInfoDto } from '../api/dto/user-out.dto';

export class KycService {
  constructor(private readonly userService: UserService) {}

  // --- USER API --- //
  async continueKyc(mandator: string, reference: string): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    // TODO: next step / retry

    return this.userService.saveAndMap(user);
  }

  async updateKycData(mandator: string, reference: string, data: KycDataDto): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    user.setData(data);

    // TODO: create customer at spider
    // TODO: update user (spiderReference)

    return this.userService.saveAndMap(user);
  }

  async uploadIncorporationCertificate(
    mandator: string,
    reference: string,
    file: Express.Multer.File,
  ): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    // TODO: update user
    // TODO: update spider

    return this.userService.saveAndMap(user);
  }

  // --- SPIDER SYNC --- //

  // TODO
}
