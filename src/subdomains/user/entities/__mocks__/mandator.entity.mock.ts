import { Mandator } from '../mandator.entity';

const defaultMandator: Partial<Mandator> = {
  id: 1,
  reference: 'mandator',
  name: 'mandator-name',
};

export function createDefaultMandator(): Mandator {
  return createCustomMandator({});
}

export function createCustomMandator(customValues: Partial<Mandator>): Mandator {
  return Object.assign(new Mandator(), { ...defaultMandator, ...customValues });
}
