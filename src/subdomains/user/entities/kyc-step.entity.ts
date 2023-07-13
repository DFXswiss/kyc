import { IEntity } from 'src/shared/db/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { KycStepName, KycStepStatus } from '../enums/kyc.enum';
import { User } from './user.entity';

@Entity()
@Index((s: KycStep) => [s.user, s.name], { unique: true, where: `status = '${KycStepStatus.IN_PROGRESS}'` })
export class KycStep extends IEntity {
  @ManyToOne(() => User, (user) => user.kycSteps, { nullable: false })
  user: User;

  @Column()
  name: KycStepName;

  @Column()
  status: KycStepStatus;

  @Column({ nullable: true })
  documentVersion?: string;

  @Column({ nullable: true })
  sessionUrl?: string;

  @Column({ nullable: true })
  setupUrl?: string;

  @Column({ nullable: true })
  sessionId?: string;

  // --- FACTORY --- //
  static create(
    name: KycStepName,
    user: User,
    documentVersion?: string,
    sessionUrl?: string,
    setupUrl?: string,
    sessionId?: string,
  ): KycStep {
    return Object.assign(new KycStep(), {
      name,
      user,
      status: KycStepStatus.IN_PROGRESS,
      documentVersion,
      sessionUrl,
      setupUrl,
      sessionId,
    });
  }

  // --- KYC PROCESS --- //
  complete(): this {
    this.status = KycStepStatus.COMPLETED;

    return this;
  }

  fail(): this {
    this.status = KycStepStatus.FAILED;

    return this;
  }
}
