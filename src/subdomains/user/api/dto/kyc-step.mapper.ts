import { KycStep } from '../../entities/kyc-step.entity';
import { User } from '../../entities/user.entity';
import { KycStepStatus } from '../../enums/kyc.enum';
import { KycService } from '../../services/kyc.service';
import { KycStepDto } from './user-out.dto';

export class KycStepMapper {
  static entityToDto(kycStep: KycStep): KycStepDto {
    const dto: KycStepDto = {
      name: kycStep.name,
      status: kycStep.status,
      sessionUrl: kycStep.sessionUrl,
      setupUrl: kycStep.setupUrl,
      sessionId: kycStep.sessionId,
    };

    return Object.assign(new KycStepDto(), dto);
  }

  static entitiesToDto(user: User): KycStepDto[] {
    const steps = user.kycSteps.map(KycStepMapper.entityToDto);
    const naSteps = KycService.getSteps(user)
      .filter((step) => !steps.some((s) => s.name === step))
      .map((s) => ({ name: s, status: KycStepStatus.NOT_STARTED }));

    return KycService.sortSteps(user, steps.concat(naSteps));
  }
}
