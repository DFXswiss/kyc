import { KycStep } from '../kyc-step.entity';

const defaultKycStep: Partial<KycStep> = {
  id: 1,
};

export function createDefaultKycStep(): KycStep {
  return createCustomKycStep({});
}

export function createCustomKycStep(customValues: Partial<KycStep>): KycStep {
  return Object.assign(new KycStep(), { ...defaultKycStep, ...customValues });
}
