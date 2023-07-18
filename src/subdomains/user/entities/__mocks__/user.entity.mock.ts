import { createDefaultLanguage } from 'src/subdomains/master-data/language/__mocks__/language.entity.mock';
import { KycStatus } from '../../enums/user.enum';
import { User } from '../user.entity';

const defaultUser: Partial<User> = {
  id: 1,
  reference: 'user',
  kycStatus: KycStatus.NOT_STARTED,
  kycSteps: [],
  language: createDefaultLanguage(),
};

export function createDefaultUser(): User {
  return createCustomUser({});
}

export function createCustomUser(customValues: Partial<User>): User {
  return Object.assign(new User(), { ...defaultUser, ...customValues });
}
