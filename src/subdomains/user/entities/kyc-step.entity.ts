import { IEntity } from 'src/shared/db/entity';
import { Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

export enum KycStepName {
  USER_DATA = 'UserData',
  FILE_UPLOAD = 'FileUpload',
  CHATBOT = 'Chatbot',
  ONLINE_ID = 'OnlineId',
  VIDEO_ID = 'VideoId',
}

export enum KycStepStatus {
  IN_PROGRESS = 'InProgress',
  FAILED = 'Failed',
  COMPLETED = 'Completed',
}

export class KycStep extends IEntity {
  @ManyToOne(() => User, (user) => user.kycSteps, { nullable: false })
  user: User;

  @Column()
  name: KycStepName;

  @Column()
  status: KycStepStatus;

  @Column({ nullable: true })
  reference?: string;

  @Column({ nullable: true })
  sessionUrl?: string;
}
