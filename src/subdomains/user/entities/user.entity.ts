import { IEntity } from 'src/shared/db/entity';
import { KycDataDto } from 'src/subdomains/kyc/api/dto/kyc-in.dto';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { Column, ManyToOne, OneToMany } from 'typeorm';
import { KycStep } from './kyc-step.entity';
import { Mandator } from './mandator.entity';

export enum KycStatus {
  NA = 'NA',
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
  static create(mandator: Mandator, reference: string): User {
    return Object.assign(new User(), { mandator, reference });
  }

  // --- KYC PROCESS --- //
  setData(data: KycDataDto) {
    // TODO: check KYC data (country!) + update steps + create new one
  }
}
