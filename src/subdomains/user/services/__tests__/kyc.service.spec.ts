import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { SpiderService } from 'src/integration/spider/services/spider.service';
import { TestUtil } from 'src/shared/utils/test.util';
import { LanguageService } from 'src/subdomains/master-data/language/language.service';
import { UserInfoMapper } from '../../api/dto/user-info.mapper';
import { createDefaultUser } from '../../entities/__mocks__/user.entity.mock';
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

  function setup(user: User) {
    jest.spyOn(userService, 'getOrThrow').mockResolvedValue(user);
    jest.spyOn(userService, 'saveAndMap').mockImplementation((u) => Promise.resolve(UserInfoMapper.toDto(u)));
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start KYC with UserData', async () => {
    const user = createDefaultUser();
    setup(user);

    const result = await service.continueKyc('mandator', 'user');

    expect(result.kycStatus).toEqual(KycStatus.IN_PROGRESS);
    expect(result.kycSteps).toHaveLength(3);

    const userDataStep = result.kycSteps[0];
    expect(userDataStep).toMatchObject({
      name: KycStepName.USER_DATA,
      status: KycStepStatus.IN_PROGRESS,
      sessionUrl: undefined,
    });

    expect(result.kycSteps.slice(1).every((s) => s.status === KycStepStatus.NOT_STARTED)).toBeTruthy();
    expect(result.kycSteps.map((s) => s.name)).toEqual([
      KycStepName.USER_DATA,
      KycStepName.CHATBOT,
      KycStepName.ONLINE_ID,
    ]);
  });
});
