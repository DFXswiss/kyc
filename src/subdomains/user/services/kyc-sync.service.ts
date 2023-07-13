import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config } from 'src/config/config';
import { DocumentVersion, KycDocumentState, KycDocuments } from 'src/integration/spider/dto/spider.dto';
import { SpiderApiRegistry } from 'src/integration/spider/services/spider-api.registry';
import { SpiderService } from 'src/integration/spider/services/spider.service';
import { DfxLogger } from 'src/shared/services/dfx-logger';
import { Lock } from 'src/shared/utils/lock';
import { Util } from 'src/shared/utils/util';
import { SettingService } from 'src/subdomains/master-data/setting/setting.service';
import { User } from '../entities/user.entity';
import { KycStepName, KycStepStatus } from '../enums/kyc.enum';
import { KycService } from './kyc.service';
import { MandatorService } from './mandator.service';
import { UserService } from './user.service';

@Injectable()
export class KycSyncService {
  private readonly logger = new DfxLogger(KycSyncService);

  constructor(
    private readonly userService: UserService,
    private readonly spiderApiRegistry: SpiderApiRegistry,
    private readonly mandatorService: MandatorService,
    private readonly settingService: SettingService,
    private readonly spiderService: SpiderService,
    private readonly kycService: KycService,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  @Lock()
  async checkOngoingKyc() {
    const usersInProgress = await this.userService.getInProgress();
    await this.syncKycUsers(usersInProgress);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Lock(7200)
  async continuousSync() {
    const settingKey = 'spiderModificationDate';
    const lastModificationTime = await this.settingService.get(settingKey);
    const newModificationTime = Date.now().toString();

    await this.syncKycData(+(lastModificationTime ?? 0));

    await this.settingService.set(settingKey, newModificationTime);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  @Lock()
  async dailySync() {
    const modificationDate = Util.daysBefore(1);
    await this.syncKycData(modificationDate.getTime());
  }

  private async syncKycData(modificationTime: number) {
    const mandators = await this.mandatorService.getAll();

    for (const mandator of mandators) {
      const changedRefs = await this.spiderApiRegistry.get(mandator.reference).getChangedCustomers(modificationTime);
      const changedUsers = await this.userService.getByReferences(mandator.reference, changedRefs);
      await this.syncKycUsers(changedUsers);
    }
  }

  async syncKycUsers(users: User[]): Promise<void> {
    for (const user of users) {
      const kycSteps = user.kycSteps.filter(
        (kycStep) =>
          kycStep.name.includes[(KycStepName.CHATBOT, KycStepName.ONLINE_ID, KycStepName.VIDEO_ID)] &&
          kycStep.status == KycStepStatus.IN_PROGRESS,
      );

      for (const kycStep of kycSteps) {
        try {
          const document = KycDocuments[kycStep.name].document;
          const version = kycStep.documentVersion;

          if (!document || !version)
            throw new Error(`No matching document version for user ${user.id} and step ${kycStep.id}`);

          const kycDocumentVersion = await this.spiderService.getKycDocumentVersion(user, document, version);

          if (
            !kycDocumentVersion ||
            kycDocumentVersion.state == KycDocumentState.FAILED ||
            this.documentAge(kycDocumentVersion) > Config.spider.failAfterDays
          ) {
            await this.kycService.stepFailed(user, kycStep);
          } else if (kycDocumentVersion.state == KycDocumentState.COMPLETED) {
            await this.kycService.stepCompleted(user, kycStep);
          }
        } catch (e) {
          this.logger.error(`Exception during KYC check for user ${user.id} in KYC step ${kycStep.id}:`, e);
        }
      }
    }
  }

  // --- HELPER METHODS --- //
  documentAge(version: DocumentVersion) {
    return Util.daysDiff(new Date(version.creationTime), new Date());
  }
}
