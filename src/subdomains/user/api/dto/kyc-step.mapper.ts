import { KycStep } from '../../entities/kyc-step.entity';
import { KycStepDto } from './user-out.dto';

export class KycStepMapper {
  static entityToDto(kycStep: KycStep): KycStepDto {
    const dto: KycStepDto = {
      name: kycStep.name,
      status: kycStep.status,
      sessionUrl: kycStep.sessionUrl,
    };

    return Object.assign(new KycStepDto(), dto);
  }

  static entitiesToDto(kycSteps: KycStep[]): KycStepDto[] {
    return kycSteps.map(KycStepMapper.entityToDto);
  }
}
