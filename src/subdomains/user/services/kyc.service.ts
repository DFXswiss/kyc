import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Config } from 'src/config/config';
import {
  DocumentVersion,
  InitiateState,
  KycDocument,
  KycDocumentState,
  KycDocuments,
} from 'src/integration/spider/dto/spider.dto';
import { SpiderService } from 'src/integration/spider/services/spider.service';
import { DfxLogger } from 'src/shared/services/dfx-logger';
import { Util } from 'src/shared/utils/util';
import { UserService } from 'src/subdomains/user/services/user.service';
import { KycDataDto } from '../api/dto/user-in.dto';
import { UserInfoDto } from '../api/dto/user-out.dto';
import { KycStep } from '../entities/kyc-step.entity';
import { User } from '../entities/user.entity';
import { KycStepName, KycStepStatus } from '../enums/kyc.enum';

@Injectable()
export class KycService {
  private readonly logger = new DfxLogger(KycService);

  private static readonly firstStep = KycStepName.USER_DATA;
  private static readonly stepOrdersPerson = [KycStepName.USER_DATA, KycStepName.CHATBOT, KycStepName.ONLINE_ID];
  private static readonly stepOrdersBusiness = [
    KycStepName.USER_DATA,
    KycStepName.FILE_UPLOAD,
    KycStepName.CHATBOT,
    KycStepName.ONLINE_ID,
  ];

  constructor(private readonly userService: UserService, private readonly spiderService: SpiderService) {}

  // --- USER API --- //
  async continueKyc(mandator: string, reference: string): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    return user.hasStepsInProgress ? this.syncKycUser(user) : this.startNextStep(user);
  }

  async updateKycData(mandator: string, reference: string, data: KycDataDto): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    const step = user.getPendingStepOrThrow(KycStepName.USER_DATA);

    // create spider customer
    const { customerId } = await this.spiderService.createCustomer(user, data);
    await this.spiderService.uploadInitialCustomerInfo(user, data);

    // update user
    user.setData(customerId, data.accountType);
    user.completeStep(step);

    return this.userService.saveAndMap(user);
  }

  async uploadIncorporationCertificate(
    mandator: string,
    reference: string,
    file: Express.Multer.File,
  ): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    const step = user.getPendingStepOrThrow(KycStepName.FILE_UPLOAD);

    const successful = await this.spiderService.uploadDocument(
      user,
      false,
      KycDocument.INCORPORATION_CERTIFICATE,
      file.originalname,
      file.mimetype,
      file.buffer,
    );

    if (!successful) throw new ServiceUnavailableException('Failed to upload file');

    user.completeStep(step);

    return this.userService.saveAndMap(user);
  }

  // --- SPIDER SYNC --- //

  async syncKycUser(user: User): Promise<UserInfoDto> {
    const stepsInProgress = user.kycSteps.filter(
      (kycStep) =>
        [KycStepName.CHATBOT, KycStepName.ONLINE_ID, KycStepName.VIDEO_ID].includes(kycStep.name) &&
        kycStep.status === KycStepStatus.IN_PROGRESS,
    );

    for (const kycStep of stepsInProgress) {
      try {
        const kycDocumentVersion = await this.loadDocumentVersionFor(user, kycStep);

        if (
          !kycDocumentVersion ||
          kycDocumentVersion.state == KycDocumentState.FAILED ||
          this.documentAge(kycDocumentVersion) > Config.spider.failAfterDays
        ) {
          user.failStep(kycStep);
        } else if (kycDocumentVersion.state == KycDocumentState.COMPLETED) {
          user.completeStep(kycStep);
        }
      } catch (e) {
        this.logger.error(`Exception during KYC check for user ${user.id} in KYC step ${kycStep.id}:`, e);
      }
    }

    return this.userService.saveAndMap(user);
  }

  // --- HELPER METHODS --- //

  // steps
  private async startNextStep(user: User) {
    const lastStep = this.getLastStep(user);
    const nextStep =
      lastStep?.status === KycStepStatus.COMPLETED
        ? this.getStep(user, this.getStepOrder(user, lastStep) + 1)
        : lastStep?.name ?? KycService.firstStep;

    if (nextStep) {
      const { documentVersion, sessionUrl, setupUrl, sessionId } = await this.initiateStep(user, nextStep);
      user.nextStep(nextStep, documentVersion, sessionId, sessionUrl, setupUrl);
    } else {
      user.kycCompleted();
    }

    return this.userService.saveAndMap(user);
  }

  private async initiateStep(
    user: User,
    nextStep: KycStepName,
  ): Promise<{ documentVersion?: string; sessionId?: string; sessionUrl?: string; setupUrl?: string }> {
    const document = KycDocuments[nextStep];
    if (!document)
      return { sessionUrl: undefined, documentVersion: undefined, setupUrl: undefined, sessionId: undefined };

    const response = await this.spiderService.initiateKycDocument(user, document.ident);

    if (response.state !== InitiateState.INITIATED) {
      this.logger.error(`Failed to initiate ${nextStep} for user ${user.id} (${response.state})`);
      throw new ServiceUnavailableException(`Initiation for ${nextStep} failed with state ${response.state}`);
    }

    return this.spiderService.getSessionData(user, response);
  }

  private getLastStep(user: User): KycStep | undefined {
    let lastStep = user.kycSteps[0];

    for (const step of user.kycSteps) {
      if (this.getStepOrder(user, step) > this.getStepOrder(user, lastStep)) lastStep = step;
    }

    return lastStep;
  }

  private getStepOrder(user: User, step: KycStep): number {
    return KycService.getSteps(user).indexOf(step.name);
  }

  private getStep(user: User, order: number): KycStepName | undefined {
    return KycService.getSteps(user)[order];
  }

  static getSteps(user: User): KycStepName[] {
    return user.isPersonal ? this.stepOrdersPerson : this.stepOrdersBusiness;
  }

  // documents

  private async loadDocumentVersionFor(user: User, kycStep: KycStep): Promise<DocumentVersion | undefined> {
    const document = KycDocuments[kycStep.name].document;
    const version = kycStep.documentVersion;

    if (!document || !version)
      throw new Error(`No matching document version for user ${user.id} and step ${kycStep.id}`);

    return this.spiderService.getKycDocumentVersion(user, document, version);
  }

  private documentAge(version: DocumentVersion): number {
    return Util.daysDiff(new Date(version.creationTime), new Date());
  }
}
