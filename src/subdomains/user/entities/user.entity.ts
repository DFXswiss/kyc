import { IEntity } from 'src/shared/db/entity';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { KycDataDto } from 'src/subdomains/user/api/dto/user-in.dto';
import { Column, ManyToOne, OneToMany } from 'typeorm';
import { KycStep } from './kyc-step.entity';
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
  setData(data: KycDataDto) {
    // TODO: check KYC data (country!) + update steps + create new one
  }
}
