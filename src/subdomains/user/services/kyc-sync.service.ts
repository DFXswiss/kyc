import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SpiderApiRegistry } from 'src/integration/spider/services/spider-api.registry';
import { Lock } from 'src/shared/utils/lock';
import { Util } from 'src/shared/utils/util';
import { SettingService } from 'src/subdomains/master-data/setting/setting.service';
import { User } from '../entities/user.entity';
import { KycService } from './kyc.service';
import { MandatorService } from './mandator.service';
import { UserService } from './user.service';

@Injectable()
export class KycSyncService {
  constructor(
    private readonly userService: UserService,
    private readonly spiderApiRegistry: SpiderApiRegistry,
    private readonly mandatorService: MandatorService,
    private readonly settingService: SettingService,
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

  private async syncKycUsers(users: User[]): Promise<void> {
    for (const user of users) {
      await this.kycService.syncKycUser(user);
    }
  }
}
