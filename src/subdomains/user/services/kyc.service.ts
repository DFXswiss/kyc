import { ServiceUnavailableException } from '@nestjs/common';
import { InitiateState, KycDocument, KycDocuments } from 'src/integration/spider/dto/spider.dto';
import { SpiderService } from 'src/integration/spider/services/spider.service';
import { DfxLogger } from 'src/shared/services/dfx-logger';
import { UserService } from 'src/subdomains/user/services/user.service';
import { KycDataDto } from '../api/dto/user-in.dto';
import { UserInfoDto } from '../api/dto/user-out.dto';
import { KycStep } from '../entities/kyc-step.entity';
import { KycStepName, KycStepStatus } from '../entities/kyc.enum';
import { User } from '../entities/user.entity';
import { AccountType } from '../entities/user.enum';

export class KycService {
  private readonly logger = new DfxLogger(KycService);
  private readonly stepOrdersPerson = [KycStepName.USER_DATA, KycStepName.CHATBOT, KycStepName.ONLINE_ID];

  private readonly stepOrdersBusiness = [
    KycStepName.USER_DATA,
    KycStepName.FILE_UPLOAD,
    KycStepName.CHATBOT,
    KycStepName.ONLINE_ID,
  ];

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
    await this.spiderService.uploadInitialCustomerInfo(user, data);

    user.setData(customerId, data.accountType);

    return this.continueKycFor(user);
  }

  async uploadIncorporationCertificate(
    mandator: string,
    reference: string,
    file: Express.Multer.File,
  ): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    const successful = await this.spiderService.uploadDocument(
      user,
      false,
      KycDocument.INCORPORATION_CERTIFICATE,
      file.originalname,
      file.mimetype,
      file.buffer,
    );

    if (!successful) throw new ServiceUnavailableException('Failed to upload file');

    user.setIncorporationCertificate();

    return this.userService.saveAndMap(user);
  }

  // --- SPIDER SYNC --- //

  async stepCompleted(user: User, kycStep: KycStep): Promise<void> {
    user.completeStep(kycStep);
  }

  async stepFailed(user: User, kycStep: KycStep): Promise<void> {
    user.failStep(kycStep);
  }

  // --- HELPER METHODS --- //
  private async continueKycFor(user: User): Promise<UserInfoDto> {
    if (!user.hasStepsInProgress()) {
      const lastStep = this.getLastStep(user);
      const nextStep =
        lastStep?.status === KycStepStatus.COMPLETED
          ? this.getStep(user, this.getStepOrder(user, lastStep) + 1)
          : lastStep?.name ?? this.getStepOrders(user)[0];

      if (nextStep) {
        let sessionUrl;
        let documentVersion;

        const document = KycDocuments[nextStep];
        if (document) {
          const response = await this.spiderService.initiateKycDocumentVersion(user, document.ident);
          if (response.state === InitiateState.INITIATED) {
            sessionUrl = response.sessionUrl;
            documentVersion = response.locators[0].version;
          } else {
            this.logger.error(`Error during initiation for ${nextStep} failed with state ${response.state}:`);
            throw new ServiceUnavailableException(`Initiation for ${nextStep} failed with state ${response.state}`);
          }
        }

        user.nextStep(nextStep, documentVersion, sessionUrl);
      } else {
        user.kycCompleted();
      }
    }

    return this.userService.saveAndMap(user);
  }

  private getLastStep(user: User): KycStep | undefined {
    let lastStep = user.kycSteps[0];

    for (const step of user.kycSteps) {
      if (this.getStepOrder(user, step) > this.getStepOrder(user, lastStep)) lastStep = step;
    }

    return lastStep;
  }

  private getStepOrder(user: User, step: KycStep): number {
    return this.getStepOrders(user).indexOf(step.name);
  }

  private getStep(user: User, order: number): KycStepName | undefined {
    return this.getStepOrders(user)[order];
  }

  private getStepOrders(user: User): KycStepName[] {
    return user.accountType === AccountType.PERSONAL ? this.stepOrdersPerson : this.stepOrdersBusiness;
  }
}
