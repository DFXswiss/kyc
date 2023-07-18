import { Country } from '../country.entity';

const defaultCountry: Partial<Country> = {
  id: 1,
  symbol: 'DE',
  name: 'Germany',
  updated: undefined,
  created: undefined,
};

export function createDefaultCountry(): Country {
  return createCustomCountry({});
}

export function createCustomCountry(customValues: Partial<Country>): Country {
  return Object.assign(new Country(), { ...defaultCountry, ...customValues });
}
