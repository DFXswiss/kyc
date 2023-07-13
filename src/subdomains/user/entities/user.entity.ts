import { IEntity } from 'src/shared/db/entity';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { Column, ManyToOne, OneToMany } from 'typeorm';
import { KycStep } from './kyc-step.entity';
import { KycStepName, KycStepStatus } from './kyc.enum';
import { Mandator } from './mandator.entity';
import { AccountType, KycStatus } from './user.enum';

export class User extends IEntity {
  @ManyToOne(() => Mandator, { nullable: false, eager: true })
  mandator: Mandator;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'integer', nullable: true })
  spiderReference: number;

  @Column({ nullable: true })
  accountType: AccountType;

  @Column({ default: KycStatus.NA })
  kycStatus: KycStatus;

  @OneToMany(() => KycStep, (step) => step.user, { eager: true, cascade: true })
  kycSteps: KycStep[];

  @ManyToOne(() => Language)
  language: Language;

  // --- FACTORY --- //
  static create(reference: string, mandator: Mandator, language: Language): User {
    return Object.assign(new User(), { mandator, reference, language });
  }

  // --- KYC PROCESS --- //
  setData(spiderReference: number, accountType: AccountType): this {
    this.spiderReference = spiderReference;
    this.accountType = accountType;

    const step = this.getPendingStepOrThrow(KycStepName.USER_DATA);
    step.complete();

    return this;
  }

  setIncorporationCertificate(): this {
    const step = this.getPendingStepOrThrow(KycStepName.FILE_UPLOAD);
    step.complete();

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

  nextStep(kycStep: KycStepName, documentVersion?: string, sessionUrl?: string): this {
    this.kycSteps.push(KycStep.create(kycStep, this, documentVersion, sessionUrl));
    this.kycStatus = KycStatus.IN_PROGRESS;

    return this;
  }

  kycCompleted(): this {
    this.kycStatus = KycStatus.COMPLETED;

    return this;
  }

  // --- HELPERS --- //
  private getPendingStepOrThrow(name: KycStepName): KycStep {
    const step = this.kycSteps.find((s) => s.name === name && s.status === KycStepStatus.IN_PROGRESS);
    if (!step) throw new Error(`Step ${name} not found for user ${this.id}`);

    return step;
  }

  hasStepsInProgress(): boolean {
    return this.kycSteps.some((s) => s.status == KycStepStatus.IN_PROGRESS);
  }
}
