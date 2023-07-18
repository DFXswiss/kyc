import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentVersion, KycDocument, KycDocumentState } from 'src/integration/spider/dto/spider.dto';
import { SpiderService } from 'src/integration/spider/services/spider.service';
import { TestUtil } from 'src/shared/utils/test.util';
import { Util } from 'src/shared/utils/util';
import { LanguageService } from 'src/subdomains/master-data/language/language.service';
import { UserInfoMapper } from '../../api/dto/user-info.mapper';
import { KycStepDto } from '../../api/dto/user-out.dto';
import { createCustomKycStep } from '../../entities/__mocks__/kyc-step.entity.mock';
import { createCustomUser } from '../../entities/__mocks__/user.entity.mock';
import { KycStep } from '../../entities/kyc-step.entity';
import { User } from '../../entities/user.entity';
import { KycStepName, KycStepStatus } from '../../enums/kyc.enum';
import { KycStatus } from '../../enums/user.enum';
import { KycService } from '../kyc.service';
import { UserService } from '../user.service';

describe('KycService', () => {
  let service: KycService;

  let userService: UserService;
  let spiderService: SpiderService;
  let languageService: LanguageService;

  beforeEach(async () => {
    userService = createMock<UserService>();
    spiderService = createMock<SpiderService>();
    languageService = createMock<LanguageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: UserService, useValue: userService },
        { provide: SpiderService, useValue: spiderService },
        { provide: LanguageService, useValue: languageService },
        TestUtil.provideConfig(),
      ],
    }).compile();

    service = module.get<KycService>(KycService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- KYC PROGRESS --- //
  it('should start KYC with UserData', async () => {
    setup();

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.IN_PROGRESS);

    expect(result.kycSteps).toMatchObject([
      createStepDto(KycStepName.USER_DATA, KycStepStatus.IN_PROGRESS),
      createStepDto(KycStepName.CHATBOT, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.ONLINE_ID, KycStepStatus.NOT_STARTED),
    ]);
  });

  // TODO

  // --- USER SYNC --- //
  it('should not sync user, if UserData in progress', async () => {
    setup({
      kycStatus: KycStatus.IN_PROGRESS,
      kycSteps: [createStep(KycStepName.USER_DATA, KycStepStatus.IN_PROGRESS)],
    });

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.IN_PROGRESS);

    expect(result.kycSteps).toMatchObject([
      createStepDto(KycStepName.USER_DATA, KycStepStatus.IN_PROGRESS),
      createStepDto(KycStepName.CHATBOT, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.ONLINE_ID, KycStepStatus.NOT_STARTED),
    ]);

    expect(spiderService.getKycDocumentVersion).toHaveBeenCalledTimes(0);
  });

  it('should sync user, if Chatbot in progress', async () => {
    const user = setup(
      {
        kycStatus: KycStatus.IN_PROGRESS,
        kycSteps: [createStep(KycStepName.CHATBOT, KycStepStatus.IN_PROGRESS, 'version')],
      },
      {
        state: KycDocumentState.PENDING,
        creationTime: Util.daysBefore(6).getTime(),
      },
    );

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.IN_PROGRESS);

    expect(result.kycSteps).toMatchObject([
      createStepDto(KycStepName.USER_DATA, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.CHATBOT, KycStepStatus.IN_PROGRESS),
      createStepDto(KycStepName.ONLINE_ID, KycStepStatus.NOT_STARTED),
    ]);

    expect(spiderService.getKycDocumentVersion).toHaveBeenCalledWith(user, KycDocument.CHATBOT, 'version');
  });

  it('should complete step, if OnlineId in progress and completed', async () => {
    const user = setup(
      {
        kycStatus: KycStatus.IN_PROGRESS,
        kycSteps: [createStep(KycStepName.ONLINE_ID, KycStepStatus.IN_PROGRESS, 'version')],
      },
      {
        state: KycDocumentState.COMPLETED,
      },
    );

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.COMPLETED);

    expect(result.kycSteps).toMatchObject([
      createStepDto(KycStepName.USER_DATA, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.CHATBOT, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.ONLINE_ID, KycStepStatus.COMPLETED),
    ]);

    expect(spiderService.getKycDocumentVersion).toHaveBeenCalledWith(
      user,
      KycDocument.ONLINE_IDENTIFICATION,
      'version',
    );
  });

  it('should fail step, if OnlineId in progress and timed out', async () => {
    const user = setup(
      {
        kycStatus: KycStatus.IN_PROGRESS,
        kycSteps: [createStep(KycStepName.ONLINE_ID, KycStepStatus.IN_PROGRESS, 'version')],
      },
      {
        state: KycDocumentState.PENDING,
        creationTime: Util.daysBefore(8).getTime(),
      },
    );

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.PAUSED);

    expect(result.kycSteps).toMatchObject([
      createStepDto(KycStepName.USER_DATA, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.CHATBOT, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.ONLINE_ID, KycStepStatus.FAILED),
    ]);

    expect(spiderService.getKycDocumentVersion).toHaveBeenCalledWith(
      user,
      KycDocument.ONLINE_IDENTIFICATION,
      'version',
    );
  });

  it('should fail step, if VideoId in progress and failed', async () => {
    const user = setup(
      {
        kycStatus: KycStatus.IN_PROGRESS,
        kycSteps: [createStep(KycStepName.VIDEO_ID, KycStepStatus.IN_PROGRESS, 'version')],
      },
      {
        state: KycDocumentState.FAILED,
      },
    );

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.PAUSED);

    expect(result.kycSteps).toMatchObject([
      createStepDto(KycStepName.VIDEO_ID, KycStepStatus.FAILED),
      createStepDto(KycStepName.USER_DATA, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.CHATBOT, KycStepStatus.NOT_STARTED),
      createStepDto(KycStepName.ONLINE_ID, KycStepStatus.NOT_STARTED),
    ]);

    expect(spiderService.getKycDocumentVersion).toHaveBeenCalledWith(user, KycDocument.VIDEO_IDENTIFICATION, 'version');
  });

  // --- HELPER METHODS --- //

  function setup(customUserValues: Partial<User> = {}, documentVersion?: Partial<DocumentVersion>): User {
    const user = createCustomUser(customUserValues);
    jest.spyOn(userService, 'getOrThrow').mockResolvedValue(user);
    jest.spyOn(userService, 'saveAndMap').mockImplementation((u) => Promise.resolve(UserInfoMapper.toDto(u)));

    documentVersion &&
      jest.spyOn(spiderService, 'getKycDocumentVersion').mockResolvedValue(documentVersion as DocumentVersion);

    return user;
  }

  function createStep(
    name: KycStepName,
    status: KycStepStatus,
    documentVersion?: string,
    sessionUrl?: string,
    setupUrl?: string,
    sessionId?: string,
  ): KycStep {
    return createCustomKycStep({ name, status, documentVersion, sessionUrl, setupUrl, sessionId });
  }

  function createStepDto(
    name: KycStepName,
    status: KycStepStatus,
    sessionUrl?: string,
    setupUrl?: string,
    sessionId?: string,
  ): KycStepDto {
    return Util.removeNullFields({ name, status, sessionUrl, setupUrl, sessionId });
  }
});
