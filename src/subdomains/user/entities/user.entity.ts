import { BadRequestException } from '@nestjs/common';
import { IEntity } from 'src/shared/db/entity';
import { DfxLogger } from 'src/shared/services/dfx-logger';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { KycStepName, KycStepStatus } from '../enums/kyc.enum';
import { AccountType, KycStatus } from '../enums/user.enum';
import { KycStep } from './kyc-step.entity';
import { Mandator } from './mandator.entity';

@Entity()
@Index((u: User) => [u.mandator, u.reference], { unique: true })
export class User extends IEntity {
  private readonly logger = new DfxLogger(User);

  @ManyToOne(() => Mandator, { nullable: false, eager: true })
  mandator: Mandator;

  @Column()
  reference: string;

  @Column({ type: 'integer', nullable: true })
  spiderReference: number;

  @Column({ nullable: true })
  accountType: AccountType;

  @Column({ default: KycStatus.NOT_STARTED })
  kycStatus: KycStatus;

  @OneToMany(() => KycStep, (step) => step.user, { eager: true, cascade: true })
  kycSteps: KycStep[];

  @ManyToOne(() => Language, { nullable: false, eager: true })
  language: Language;

  // --- FACTORY --- //
  static create(reference: string, mandator: Mandator, language: Language): User {
    return Object.assign(new User(), { mandator, reference, language, kycSteps: [] });
  }

  // --- KYC PROCESS --- //
  setData(spiderReference: number, accountType: AccountType): this {
    this.spiderReference = spiderReference;
    this.accountType = accountType;

    return this;
  }

  completeStep(kycStep: KycStep): this {
    kycStep.complete();

    this.logger.verbose(`User ${this.id} completes step ${kycStep.name} (${kycStep.id})`);

    return this;
  }

  failStep(kycStep: KycStep): this {
    kycStep.fail();

    if (!this.hasStepsInProgress) this.kycStatus == KycStatus.PAUSED;

    this.logger.verbose(`User ${this.id} fails step ${kycStep.name} (${kycStep.id})`);

    return this;
  }

  nextStep(
    kycStep: KycStepName,
    documentVersion?: string,
    sessionId?: string,
    sessionUrl?: string,
    setupUrl?: string,
  ): this {
    this.kycSteps.push(KycStep.create(kycStep, this, documentVersion, sessionId, sessionUrl, setupUrl));
    this.kycStatus = KycStatus.IN_PROGRESS;

    this.logger.verbose(`User ${this.id} starts step ${kycStep}`);

    return this;
  }

  kycCompleted(): this {
    this.kycStatus = KycStatus.COMPLETED;

    this.logger.verbose(`User ${this.id} completes`);

    return this;
  }

  // --- HELPERS --- //
  getPendingStep(name: KycStepName): KycStep | undefined {
    return this.kycSteps.find((s) => s.name === name && s.status === KycStepStatus.IN_PROGRESS);
  }

  getPendingStepOrThrow(name: KycStepName): KycStep {
    const step = this.getPendingStep(name);
    if (!step) throw new BadRequestException(`Step ${name} not in progress`);

    return step;
  }

  get hasStepsInProgress(): boolean {
    return this.kycSteps.some((s) => s.status == KycStepStatus.IN_PROGRESS);
  }

  get hasAllStepsCompleted(): boolean {
    return this.kycSteps.every((s) => s.status == KycStepStatus.COMPLETED);
  }

  get isPersonal(): boolean {
    return !this.accountType || this.accountType === AccountType.PERSONAL;
  }
}
