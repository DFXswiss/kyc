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
import { LanguageService } from 'src/subdomains/master-data/language/language.service';
import { UserService } from 'src/subdomains/user/services/user.service';
import { KycDataDto, SettingsDto } from '../api/dto/user-in.dto';
import { KycStepDto, UserInfoDto } from '../api/dto/user-out.dto';
import { KycStep } from '../entities/kyc-step.entity';
import { User } from '../entities/user.entity';
import { KycStepName, KycStepStatus } from '../enums/kyc.enum';

export type Step = KycStep | KycStepDto;

@Injectable()
export class KycService {
  private readonly logger = new DfxLogger(KycService);

  private static readonly firstStep = KycStepName.USER_DATA;
  private static readonly personSteps = [KycStepName.USER_DATA, KycStepName.CHATBOT, KycStepName.ONLINE_ID];
  private static readonly businessSteps = [
    KycStepName.USER_DATA,
    KycStepName.INCORP_CERT,
    KycStepName.CHATBOT,
    KycStepName.ONLINE_ID,
  ];

  private static readonly stepStatusOrder = [
    KycStepStatus.FAILED,
    KycStepStatus.NOT_STARTED,
    KycStepStatus.IN_PROGRESS,
    KycStepStatus.COMPLETED,
  ];

  constructor(
    private readonly userService: UserService,
    private readonly spiderService: SpiderService,
    private readonly languageService: LanguageService,
  ) {}

  // --- USER API --- //
  async continueKyc(mandator: string, reference: string): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    return user.hasStepsInProgress ? this.syncKycUser(user) : this.updateProgress(user, true);
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

    return this.updateProgress(user, false);
  }

  async updateSettings(mandator: string, reference: string, settings: SettingsDto): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    if (settings.language) {
      user.language = settings.language = await this.languageService.getOrThrow(settings.language.id);
    }

    if (settings.phone) {
      // fail chatbot in progress
      const kycStep = user.getPendingStep(KycStepName.CHATBOT);
      if (kycStep) user.failStep(kycStep);
    }

    await this.spiderService.updateCustomer(user, settings);

    return this.updateProgress(user, false);
  }

  async uploadIncorporationCertificate(
    mandator: string,
    reference: string,
    file: Express.Multer.File,
  ): Promise<UserInfoDto> {
    const user = await this.userService.getOrThrow(mandator, reference);

    const step = user.getPendingStepOrThrow(KycStepName.INCORP_CERT);

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

    return this.updateProgress(user, false);
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

    return this.updateProgress(user, false);
  }

  // --- STEPPING HELPER METHODS --- //
  private async updateProgress(user: User, shouldContinue: boolean) {
    if (!user.hasStepsInProgress) {
      const lastStep = KycService.getLastStep(user);
      const nextStep =
        lastStep?.status === KycStepStatus.COMPLETED
          ? KycService.getStep(user, KycService.getStepIndex(user, lastStep) + 1)
          : lastStep?.name ?? KycService.firstStep;

      if (!nextStep) {
        // no more steps to do
        user.kycCompleted();
      } else if (shouldContinue) {
        // continue with next step
        const { documentVersion, sessionUrl, setupUrl, sessionId } = await this.initiateStep(user, nextStep);
        user.nextStep(nextStep, documentVersion, sessionId, sessionUrl, setupUrl);
      }
    }

    return this.userService.saveAndMap(user);
  }

  private async initiateStep(
    user: User,
    nextStep: KycStepName,
  ): Promise<{ documentVersion?: string; sessionId?: string; sessionUrl?: string; setupUrl?: string }> {
    const document = KycDocuments[nextStep];
    if (!document) {
      // no initialization required
      return { sessionUrl: undefined, documentVersion: undefined, setupUrl: undefined, sessionId: undefined };
    }

    const response = await this.spiderService.initiateKycDocument(user, document.ident);

    if (response.state !== InitiateState.INITIATED) {
      this.logger.error(`Failed to initiate ${nextStep} for user ${user.id} (${response.state})`);
      throw new ServiceUnavailableException(`Initiation for ${nextStep} failed with state ${response.state}`);
    }

    return this.spiderService.getSessionData(user, response);
  }

  private static getLastStep(user: User): KycStep {
    const sortedSteps = KycService.sortSteps(user, user.kycSteps);
    return sortedSteps[sortedSteps.length - 1];
  }

  static getSteps(user: User): KycStepName[] {
    return user.isPersonal ? this.personSteps : this.businessSteps;
  }

  // sorting
  static sortSteps<T extends Step>(user: User, steps: T[]): T[] {
    return steps.sort((a, b) => {
      const indexA = this.getStepIndex(user, a);
      const indexB = this.getStepIndex(user, b);

      if (indexA === indexB) {
        return KycService.getStepStatusIndex(a) - KycService.getStepStatusIndex(b);
      }

      return indexA - indexB;
    });
  }

  private static getStep(user: User, index: number): KycStepName | undefined {
    return KycService.getSteps(user)[index];
  }

  private static getStepIndex(user: User, step: Step): number {
    return KycService.getSteps(user).indexOf(step.name);
  }

  private static getStepStatusIndex(step: Step): number {
    return KycService.stepStatusOrder.indexOf(step.status);
  }

  // --- DOCUMENT HELPER METHODS --- //

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
