import { SpiderService } from 'src/integration/spider/services/spider.service';
import { UserService } from 'src/subdomains/user/services/user.service';
import { KycDataDto } from '../api/dto/user-in.dto';
import { UserInfoDto } from '../api/dto/user-out.dto';
import { KycStepStatus } from '../entities/kyc-step.entity';
import { User } from '../entities/user.entity';

export class KycService {
  constructor(private readonly userService: UserService, private readonly spiderService: SpiderService) {}

  // --- USER API --- //
  async continueKyc(mandator: string, reference: string): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    return this.continueKycFor(user);
  }

  async updateKycData(mandator: string, reference: string, data: KycDataDto): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    // create spider customer
    const { customerId } = await this.spiderService.createCustomer(user, data);

    user.setData(customerId, data.accountType);

    return this.continueKycFor(user);
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

  // --- HELPER METHODS --- //
  private async continueKycFor(user: User): Promise<UserInfoDto> {
    if (user.kycSteps.every((s) => s.status !== KycStepStatus.IN_PROGRESS)) {
      // TODO: next step / retry, update KYC status
    }

    return this.userService.saveAndMap(user);
  }
}
