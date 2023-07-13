import { IEntity } from 'src/shared/db/entity';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { Column, ManyToOne, OneToMany } from 'typeorm';
import { KycStep, KycStepName } from './kyc-step.entity';
import { Mandator } from './mandator.entity';

export enum KycStatus {
  NA = 'NA',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  PAUSED = 'Paused',
}

export enum AccountType {
  PERSONAL = 'Personal',
  BUSINESS = 'Business',
  SOLE_PROPRIETORSHIP = 'SoleProprietorship',
}

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

    const step = this.getStepOrThrow(KycStepName.USER_DATA);
    step.complete();

    return this;
  }

  nextStep(kycStep: KycStepName): this {
    this.kycSteps.push(KycStep.create(kycStep, this));
    this.kycStatus = KycStatus.IN_PROGRESS;

    return this;
  }

  kycCompleted(): this {
    this.kycStatus = KycStatus.COMPLETED;

    return this;
  }

  // --- HELPERS --- //
  private getStepOrThrow(name: KycStepName): KycStep {
    const step = this.kycSteps.find((s) => s.name === name);
    if (!step) throw new Error(`Step ${name} not found for user ${this.id}`);

    return step;
  }
}
