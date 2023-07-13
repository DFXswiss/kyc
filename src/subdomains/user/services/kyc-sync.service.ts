import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SpiderApiRegistry } from 'src/integration/spider/services/spider-api.registry';
import { DfxLogger } from 'src/shared/services/dfx-logger';
import { Lock } from 'src/shared/utils/lock';
import { Util } from 'src/shared/utils/util';
import { SettingService } from 'src/subdomains/master-data/setting/setting.service';
import { KycStepName, KycStepStatus } from '../entities/kyc-step.entity';
import { User } from '../entities/user.entity';
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
          //kyc service
        } catch (e) {
          this.logger.error(`Exception during KYC check for user ${user.id} in KYC step ${kycStep.id}:`, e);
        }
      }
    }
  }
}
