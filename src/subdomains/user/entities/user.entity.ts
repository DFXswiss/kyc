import { IEntity } from 'src/shared/db/entity';
import { Language } from 'src/subdomains/master-data/language/language.entity';
import { Column, ManyToOne, OneToMany } from 'typeorm';
import { KycStep } from './kyc-step.entity';
import { Mandator } from './mandator.entity';

export enum KycStatus {
  NA = 'NA',
}

export class User extends IEntity {
  @ManyToOne(() => Mandator, { nullable: false, eager: true })
  mandator: Mandator;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'integer' })
  spiderReference: number;

  @Column({ default: KycStatus.NA })
  kycStatus: KycStatus;

  @OneToMany(() => KycStep, (step) => step.user, { eager: true })
  kycSteps: KycStep[];

  @ManyToOne(() => Language)
  language: Language;
}
