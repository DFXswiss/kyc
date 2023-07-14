import { BadRequestException } from '@nestjs/common';
import { IEntity } from 'src/shared/db/entity';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { KycStepName, KycStepStatus } from '../enums/kyc.enum';
import { AccountType, KycStatus } from '../enums/user.enum';
import { KycStep } from './kyc-step.entity';
import { Mandator } from './mandator.entity';

@Entity()
@Index((u: User) => [u.mandator, u.reference], { unique: true })
export class User extends IEntity {
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

  @ManyToOne(() => Language, { eager: true })
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

    return this;
  }

  failStep(kycStep: KycStep): this {
    kycStep.fail();

    if (!this.hasStepsInProgress) this.kycStatus == KycStatus.PAUSED;

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

    return this;
  }

  kycCompleted(): this {
    this.kycStatus = KycStatus.COMPLETED;

    return this;
  }

  // --- HELPERS --- //
  getPendingStepOrThrow(name: KycStepName): KycStep {
    const step = this.kycSteps.find((s) => s.name === name && s.status === KycStepStatus.IN_PROGRESS);
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
